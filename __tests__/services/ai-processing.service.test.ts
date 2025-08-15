import { AIProcessingService, OpportunityClassification } from '@/lib/services/ai-processing.service'

// Mock AI SDK
jest.mock('ai', () => ({
  generateObject: jest.fn()
}))

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    analysis: {
      update: jest.fn()
    },
    redditPost: {
      updateMany: jest.fn()
    },
    opportunity: {
      createMany: jest.fn(),
      findMany: jest.fn()
    }
  }
}))

// Mock Cost Tracking Service
jest.mock('@/lib/services/cost-tracking.service', () => ({
  CostTrackingService: jest.fn().mockImplementation(() => ({
    recordCostEvent: jest.fn()
  }))
}))

// Mock cost calculator
jest.mock('@/lib/utils/cost-calculator', () => ({
  calculateEventCost: jest.fn().mockReturnValue(0.003)
}))

// Mock structured logging
jest.mock('@/lib/observability/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    business: jest.fn()
  }
}))

import { generateObject } from 'ai'
import { prisma } from '@/lib/db'

const mockGenerateObject = generateObject as jest.MockedFunction<typeof generateObject>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('AIProcessingService', () => {
  let service: AIProcessingService
  const testAnalysisId = 'test-analysis-123'

  const mockPosts = [
    {
      id: 'post-1',
      title: 'I hate manually managing my inventory - so frustrating!',
      content: 'Looking for a better solution to track inventory across multiple locations...',
      subreddit: 'entrepreneur',
      score: 45,
      numComments: 12,
      comments: [
        { content: 'Same problem here', score: 8 },
        { content: 'Try this tool...', score: 5 }
      ]
    },
    {
      id: 'post-2',
      title: 'Best practices for team communication?',
      content: 'Our team is growing and Slack is getting chaotic...',
      subreddit: 'startups',
      score: 23,
      numComments: 7,
      comments: [
        { content: 'Use Discord instead', score: 3 }
      ]
    }
  ]

  const mockClassification: OpportunityClassification = {
    isSaasFeasible: true,
    confidence: 0.85,
    urgencyScore: 85,
    marketSignalsScore: 75,
    feasibilityScore: 80,
    problemStatement: 'Manual inventory management causing operational inefficiencies',
    evidence: [
      'User expresses clear frustration',
      'Multiple location complexity',
      'Active seeking for solution'
    ],
    antiPatterns: [],
    reasoning: 'Clear problem statement with market validation signals'
  }

  beforeEach(() => {
    service = new AIProcessingService(testAnalysisId)
    jest.clearAllMocks()
  })

  describe('processPosts', () => {
    beforeEach(() => {
      mockGenerateObject.mockResolvedValue({ 
        object: mockClassification 
      } as any)
      mockPrisma.analysis.update.mockResolvedValue({} as any)
      mockPrisma.redditPost.updateMany.mockResolvedValue({ count: 2 } as any)
      mockPrisma.opportunity.createMany.mockResolvedValue({ count: 1 } as any)
    })

    it('should process posts in batches successfully', async () => {
      await service.processPosts(mockPosts, 1)

      // Should update progress initially
      expect(mockPrisma.analysis.update).toHaveBeenCalledWith({
        where: { id: testAnalysisId },
        data: {
          progress: expect.stringContaining('"stage":"ai_processing"')
        }
      })

      // Should mark posts as processed
      expect(mockPrisma.redditPost.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['post-1', 'post-2'] },
          analysisId: testAnalysisId
        },
        data: {
          processed: true
        }
      })
    })

    it('should update progress throughout processing', async () => {
      await service.processPosts(mockPosts, 1)

      // Should call update multiple times for progress
      const updateCalls = mockPrisma.analysis.update.mock.calls
      expect(updateCalls.length).toBeGreaterThan(2)

      // Check initial progress
      const initialProgress = JSON.parse(updateCalls[0][0].data.progress)
      expect(initialProgress).toEqual({
        stage: 'ai_processing',
        message: 'Analyzing posts for SaaS opportunities...',
        percentage: 60,
        totalPosts: 2,
        processedPosts: 0
      })
    })

    it('should store high-scoring opportunities', async () => {
      await service.processPosts(mockPosts, 2)

      // Should call createMany at least once
      expect(mockPrisma.opportunity.createMany).toHaveBeenCalled()
      
      // Check if any call includes our expected data structure
      const createManyCalls = mockPrisma.opportunity.createMany.mock.calls
      const hasExpectedData = createManyCalls.some(call => {
        const data = call[0].data
        return Array.isArray(data) && data.some(item => 
          item.analysisId === testAnalysisId &&
          item.classification === 'saas_feasible'
        )
      })
      
      expect(hasExpectedData).toBe(true)
    })

    it('should filter out low-scoring opportunities', async () => {
      const lowScoreClassification = {
        ...mockClassification,
        urgencyScore: 30,
        marketSignalsScore: 25,
        feasibilityScore: 35
      }
      
      mockGenerateObject.mockResolvedValue({ 
        object: lowScoreClassification 
      } as any)

      await service.processPosts(mockPosts, 2)

      // Should call createMany but with empty data or filtered data
      expect(mockPrisma.opportunity.createMany).toHaveBeenCalled()
      
      // Check that no high-scoring opportunities were stored
      const createManyCalls = mockPrisma.opportunity.createMany.mock.calls
      const hasHighScoringData = createManyCalls.some(call => {
        const data = call[0].data
        return Array.isArray(data) && data.some(item => 
          item.opportunityScore >= 70
        )
      })
      
      expect(hasHighScoringData).toBe(false)
    })

    it('should handle AI classification errors gracefully', async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error('OpenAI API error'))
      
      // Should not throw and continue processing
      await expect(service.processPosts([mockPosts[0]], 1)).resolves.not.toThrow()
      
      // Should still mark posts as processed
      expect(mockPrisma.redditPost.updateMany).toHaveBeenCalled()
    })

    it('should handle batching correctly', async () => {
      const largePosts = Array.from({ length: 5 }, (_, i) => ({
        ...mockPosts[0],
        id: `post-${i + 1}`
      }))

      await service.processPosts(largePosts, 2)

      // Should process in 3 batches (2, 2, 1)
      expect(mockGenerateObject).toHaveBeenCalledTimes(5)
    })

    it('should track AI costs for each post', async () => {
      const CostTrackingService = require('@/lib/services/cost-tracking.service').CostTrackingService
      const mockCostServiceInstance = CostTrackingService.mock.instances[0]
      const mockRecordCost = mockCostServiceInstance.recordCostEvent

      await service.processPosts([mockPosts[0]], 1)

      expect(mockRecordCost).toHaveBeenCalledWith({
        analysisId: testAnalysisId,
        eventType: 'openai_tokens',
        provider: 'openai',
        quantity: expect.any(Number),
        unitCost: 0.00003,
        totalCost: 0.003,
        eventData: {
          model: 'gpt-4-turbo-preview',
          timestamp: expect.any(String)
        }
      })
    })
  })

  describe('opportunity scoring', () => {
    it('should calculate opportunity score correctly', async () => {
      // Access private method for testing
      const score = (service as any).calculateOpportunityScore(mockClassification)
      
      // Expected: (85 * 0.35) + (75 * 0.35) + (80 * 0.3) = 29.75 + 26.25 + 24 = 80
      // With confidence: 80 * 0.85 = 68
      expect(score).toBe(68)
    })

    it('should apply confidence modifier correctly', async () => {
      const lowConfidenceClassification = {
        ...mockClassification,
        confidence: 0.5
      }
      
      const score = (service as any).calculateOpportunityScore(lowConfidenceClassification)
      expect(score).toBe(40) // 80 * 0.5
    })
  })

  describe('prompt building', () => {
    it('should build comprehensive classification prompt', async () => {
      const prompt = (service as any).buildClassificationPrompt(mockPosts[0])

      expect(prompt).toContain('I hate manually managing my inventory')
      expect(prompt).toContain('r/entrepreneur')
      expect(prompt).toContain('Score: 45')
      expect(prompt).toContain('Same problem here')
      expect(prompt).toContain('SaaS opportunity potential')
      expect(prompt).toContain('urgency')
      expect(prompt).toContain('feasibility')
    })

    it('should handle posts without content or comments', async () => {
      const minimalPost = {
        id: 'post-minimal',
        title: 'Test title',
        subreddit: 'test',
        score: 1,
        numComments: 0
      }

      const prompt = (service as any).buildClassificationPrompt(minimalPost)

      expect(prompt).toContain('No content')
      expect(prompt).toContain('No comments')
      expect(prompt).toContain('Test title')
    })
  })

  describe('getTopOpportunities', () => {
    it('should retrieve top opportunities with correct filters', async () => {
      const mockOpportunities = [
        {
          id: 'opp-1',
          opportunityScore: 85,
          sourcePost: { title: 'Test post' }
        }
      ]

      mockPrisma.opportunity.findMany.mockResolvedValue(mockOpportunities as any)

      const result = await service.getTopOpportunities(5)

      expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith({
        where: {
          analysisId: testAnalysisId,
          opportunityScore: {
            gte: 70
          }
        },
        orderBy: {
          opportunityScore: 'desc'
        },
        take: 5,
        include: {
          sourcePost: true
        }
      })

      expect(result).toEqual(mockOpportunities)
    })

    it('should use default limit when not provided', async () => {
      mockPrisma.opportunity.findMany.mockResolvedValue([])

      await service.getTopOpportunities()

      expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10
        })
      )
    })
  })

  describe('error handling', () => {
    it('should handle database errors during processing', async () => {
      mockPrisma.analysis.update.mockRejectedValueOnce(new Error('Database error'))

      await expect(service.processPosts(mockPosts)).rejects.toThrow('Database error')
    })

    it('should return fallback classification on AI error', async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error('OpenAI error'))

      const result = await (service as any).classifyPost(mockPosts[0])

      expect(result).toEqual({
        isSaasFeasible: false,
        confidence: 0,
        urgencyScore: 0,
        marketSignalsScore: 0,
        feasibilityScore: 0,
        problemStatement: '',
        evidence: [],
        antiPatterns: [],
        reasoning: 'Classification failed'
      })
    })

    it('should handle cost tracking errors gracefully', async () => {
      const CostTrackingService = require('@/lib/services/cost-tracking.service').CostTrackingService
      const mockCostServiceInstance = CostTrackingService.mock.instances[0]
      const mockRecordCost = mockCostServiceInstance.recordCostEvent
      mockRecordCost.mockRejectedValueOnce(new Error('Cost tracking error'))

      // Should not throw on cost tracking error
      await expect((service as any).trackAICosts(100)).resolves.not.toThrow()
    })
  })

  describe('batching logic', () => {
    it('should create correct number of batches', async () => {
      const items = [1, 2, 3, 4, 5, 6, 7]
      const batches = (service as any).createBatches(items, 3)

      expect(batches).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7]
      ])
    })

    it('should handle empty arrays', async () => {
      const batches = (service as any).createBatches([], 3)
      expect(batches).toEqual([])
    })

    it('should handle single item', async () => {
      const batches = (service as any).createBatches([1], 3)
      expect(batches).toEqual([[1]])
    })
  })

  describe('data storage', () => {
    it('should limit text field lengths to prevent database errors', async () => {
      const longClassification = {
        ...mockClassification,
        problemStatement: 'A'.repeat(2000), // Very long statement
        reasoning: 'B'.repeat(1000) // Very long reasoning
      }

      mockGenerateObject.mockResolvedValue({ 
        object: longClassification 
      } as any)

      const longPost = {
        ...mockPosts[0],
        title: 'C'.repeat(300) // Very long title
      }

      await service.processPosts([longPost], 1)

      const createCall = mockPrisma.opportunity.createMany.mock.calls[0][0]
      const opportunityData = createCall.data[0]

      expect(opportunityData.title.length).toBeLessThanOrEqual(200)
      expect(opportunityData.problemStatement.length).toBeLessThanOrEqual(1000)
      
      const metadata = JSON.parse(opportunityData.metadata)
      expect(metadata.reasoning.length).toBeLessThanOrEqual(500)
    })

    it('should store metadata correctly', async () => {
      await service.processPosts([mockPosts[0]], 1)

      const createCall = mockPrisma.opportunity.createMany.mock.calls[0][0]
      const opportunityData = createCall.data[0]
      const metadata = JSON.parse(opportunityData.metadata)

      expect(metadata).toEqual({
        reasoning: mockClassification.reasoning,
        postScore: 45,
        postComments: 12,
        subreddit: 'entrepreneur',
        classificationTimestamp: expect.any(String)
      })
    })
  })
})