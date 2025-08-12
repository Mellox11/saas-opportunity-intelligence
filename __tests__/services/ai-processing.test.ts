import { AIProcessingService } from '@/lib/services/ai-processing.service'

// Mock the AI SDK
jest.mock('ai', () => ({
  generateObject: jest.fn(),
  generateText: jest.fn()
}))

// Mock OpenAI SDK
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mock-model')
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
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn()
    }
  }
}))

// Mock CostTrackingService
jest.mock('@/lib/services/cost-tracking.service', () => ({
  CostTrackingService: jest.fn().mockImplementation(() => ({
    recordCostEvent: jest.fn()
  }))
}))

import { generateObject } from 'ai'
import { prisma } from '@/lib/db'

describe('AIProcessingService', () => {
  let service: AIProcessingService
  const analysisId = 'test-analysis-123'

  beforeEach(() => {
    service = new AIProcessingService(analysisId)
    jest.clearAllMocks()
  })

  describe('processPosts', () => {
    const mockPosts = [
      {
        id: 'post1',
        title: 'I hate dealing with invoicing for my freelance work',
        content: 'It takes hours every month and clients always pay late',
        subreddit: 'freelance',
        score: 150,
        numComments: 45,
        comments: [
          { content: 'Same here, I waste so much time on this', score: 20 },
          { content: 'I would pay for a solution', score: 15 }
        ]
      },
      {
        id: 'post2',
        title: 'Random post about cats',
        content: 'My cat is cute',
        subreddit: 'cats',
        score: 5,
        numComments: 2,
        comments: []
      }
    ]

    it('should process posts and identify opportunities', async () => {
      // Mock AI classification for first post (good opportunity)
      ;(generateObject as jest.Mock).mockResolvedValueOnce({
        object: {
          isSaasFeasible: true,
          confidence: 0.9,
          urgencyScore: 85,
          marketSignalsScore: 80,
          feasibilityScore: 75,
          problemStatement: 'Freelancers need automated invoicing and payment tracking',
          evidence: [
            'High engagement (150 score, 45 comments)',
            'Multiple users expressing same pain',
            'Willingness to pay mentioned'
          ],
          antiPatterns: [],
          reasoning: 'Clear problem with market demand'
        }
      })

      // Mock AI classification for second post (not an opportunity)
      ;(generateObject as jest.Mock).mockResolvedValueOnce({
        object: {
          isSaasFeasible: false,
          confidence: 0.95,
          urgencyScore: 0,
          marketSignalsScore: 0,
          feasibilityScore: 0,
          problemStatement: '',
          evidence: [],
          antiPatterns: ['Not a business problem'],
          reasoning: 'Personal content, not a SaaS opportunity'
        }
      })

      await service.processPosts(mockPosts, 2)

      // Verify analysis was updated with progress
      expect(prisma.analysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: analysisId },
          data: expect.objectContaining({
            progress: expect.stringContaining('ai_processing')
          })
        })
      )

      // Verify only the good opportunity was stored
      expect(prisma.opportunity.create).toHaveBeenCalledTimes(1)
      expect(prisma.opportunity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            analysisId,
            sourcePostId: 'post1',
            title: expect.stringContaining('invoicing'),
            opportunityScore: expect.any(Number),
            classification: 'saas_feasible'
          })
        })
      )

      // Verify posts were marked as processed
      expect(prisma.redditPost.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: { in: ['post1', 'post2'] },
            analysisId
          },
          data: {
            processed: true
          }
        })
      )
    })

    it('should handle AI classification errors gracefully', async () => {
      // Mock AI error
      ;(generateObject as jest.Mock).mockRejectedValue(new Error('OpenAI API error'))

      // Should not throw, but continue processing
      await expect(service.processPosts(mockPosts, 2)).resolves.not.toThrow()
      
      // No opportunities should be created
      expect(prisma.opportunity.create).not.toHaveBeenCalled()
      
      // Posts should still be marked as processed
      expect(prisma.redditPost.updateMany).toHaveBeenCalled()
    })

    it('should filter out low-scoring opportunities', async () => {
      // Mock classification with low scores
      ;(generateObject as jest.Mock).mockResolvedValue({
        object: {
          isSaasFeasible: true,
          confidence: 0.5,
          urgencyScore: 40,
          marketSignalsScore: 30,
          feasibilityScore: 35,
          problemStatement: 'Minor inconvenience',
          evidence: ['Some evidence'],
          antiPatterns: [],
          reasoning: 'Weak opportunity'
        }
      })

      await service.processPosts([mockPosts[0]], 1)

      // Opportunity score would be ~34, below 70 threshold
      expect(prisma.opportunity.create).not.toHaveBeenCalled()
    })
  })

  describe('getTopOpportunities', () => {
    it('should retrieve top opportunities sorted by score', async () => {
      const mockOpportunities = [
        { id: '1', opportunityScore: 90, title: 'High score' },
        { id: '2', opportunityScore: 75, title: 'Medium score' }
      ]

      ;(prisma.opportunity.findMany as jest.Mock).mockResolvedValue(mockOpportunities)

      const result = await service.getTopOpportunities(10)

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            analysisId,
            opportunityScore: { gte: 70 }
          },
          orderBy: { opportunityScore: 'desc' },
          take: 10,
          include: { sourcePost: true }
        })
      )

      expect(result).toEqual(mockOpportunities)
    })
  })

  describe('opportunity scoring', () => {
    it('should calculate opportunity score correctly', async () => {
      const mockClassification = {
        isSaasFeasible: true,
        confidence: 0.8,
        urgencyScore: 80,
        marketSignalsScore: 70,
        feasibilityScore: 60,
        problemStatement: 'Test problem',
        evidence: ['evidence'],
        reasoning: 'Test reasoning'
      }

      ;(generateObject as jest.Mock).mockResolvedValue({
        object: mockClassification
      })

      const testPost = {
        id: 'test-post',
        title: 'Test post',
        content: 'Test content',
        subreddit: 'test',
        score: 100,
        numComments: 10,
        comments: []
      }

      await service.processPosts([testPost], 1)

      // Expected score: (80*0.35 + 70*0.35 + 60*0.3) * 0.8 = 70.5 * 0.8 = 56.4 ≈ 56
      // This would not meet the 70 threshold
      expect(prisma.opportunity.create).not.toHaveBeenCalled()
    })

    it('should include high-scoring opportunities', async () => {
      const mockClassification = {
        isSaasFeasible: true,
        confidence: 0.95,
        urgencyScore: 90,
        marketSignalsScore: 85,
        feasibilityScore: 80,
        problemStatement: 'Strong problem',
        evidence: ['strong evidence'],
        reasoning: 'Excellent opportunity'
      }

      ;(generateObject as jest.Mock).mockResolvedValue({
        object: mockClassification
      })

      const testPost = {
        id: 'test-post-high-score',
        title: 'High scoring test post',
        content: 'Strong problem content',
        subreddit: 'test',
        score: 200,
        numComments: 50,
        comments: []
      }

      await service.processPosts([testPost], 1)

      // Expected score: (90*0.35 + 85*0.35 + 80*0.3) * 0.95 = 85.25 * 0.95 = 81 ≈ 81
      // This meets the 70 threshold
      expect(prisma.opportunity.create).toHaveBeenCalledTimes(1)
    })
  })

  describe('batch processing', () => {
    it('should process posts in batches', async () => {
      const largeMockPosts = Array(25).fill(null).map((_, i) => ({
        id: `post${i}`,
        title: `Post ${i}`,
        content: 'Content',
        subreddit: 'test',
        score: 10,
        numComments: 5,
        comments: []
      }))

      ;(generateObject as jest.Mock).mockResolvedValue({
        object: {
          isSaasFeasible: false,
          confidence: 0.5,
          urgencyScore: 30,
          marketSignalsScore: 20,
          feasibilityScore: 25,
          problemStatement: '',
          evidence: [],
          reasoning: 'Not feasible'
        }
      })

      await service.processPosts(largeMockPosts, 10)

      // Should process in 3 batches (10, 10, 5)
      // Each post gets classified once
      expect(generateObject).toHaveBeenCalledTimes(25)

      // Progress should be updated multiple times
      const progressCalls = (prisma.analysis.update as jest.Mock).mock.calls
      expect(progressCalls.length).toBeGreaterThan(3)
    })
  })
})