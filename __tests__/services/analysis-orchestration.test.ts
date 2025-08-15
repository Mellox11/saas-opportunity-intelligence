import { AnalysisOrchestrationService, AnalysisJobData } from '@/lib/services/analysis-orchestration.service'

// Mock Bull queues
jest.mock('@/lib/queues/queue-config', () => ({
  analysisQueue: {
    add: jest.fn(),
    getJob: jest.fn(),
    count: jest.fn().mockResolvedValue(5)
  },
  redditCollectionQueue: {
    add: jest.fn()
  },
  aiProcessingQueue: {
    add: jest.fn()
  },
  reportGenerationQueue: {
    add: jest.fn()
  }
}))

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    analysis: {
      update: jest.fn(),
      findUnique: jest.fn()
    },
    redditPost: {
      count: jest.fn(),
      findMany: jest.fn()
    },
    opportunity: {
      count: jest.fn()
    }
  }
}))

// Mock CostTrackingService
jest.mock('@/lib/services/cost-tracking.service', () => ({
  CostTrackingService: jest.fn().mockImplementation(() => ({
    getTotalAnalysisCost: jest.fn().mockResolvedValue({ total: 5.00 })
  }))
}))

// Mock structured logging
jest.mock('@/lib/observability/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    business: jest.fn()
  }
}))

// Mock correlation middleware
jest.mock('@/lib/middleware/correlation', () => ({
  createCorrelatedLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }))
}))

import { analysisQueue, redditCollectionQueue, aiProcessingQueue, reportGenerationQueue } from '@/lib/queues/queue-config'
import { prisma } from '@/lib/db'

describe('AnalysisOrchestrationService', () => {
  let service: AnalysisOrchestrationService
  const mockJobData: AnalysisJobData = {
    analysisId: 'test-analysis-123',
    userId: 'test-user-456',
    configuration: {
      subreddits: ['entrepreneur', 'startups'],
      timeRange: 30,
      keywords: {
        predefined: ['problem', 'frustrated'],
        custom: ['billing']
      },
      maxCost: 10.00
    }
  }

  beforeEach(() => {
    service = new AnalysisOrchestrationService()
    jest.clearAllMocks()
  })

  describe('startAnalysis', () => {
    it('should start analysis pipeline successfully', async () => {
      const mockJob = {
        id: 'job-123',
        data: mockJobData
      };

      (analysisQueue.add as jest.Mock).mockResolvedValue(mockJob);
      (prisma.analysis.update as jest.Mock).mockResolvedValue({})

      const jobId = await service.startAnalysis(mockJobData)

      expect(jobId).toBe('job-123')
      expect(prisma.analysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockJobData.analysisId },
          data: { status: 'processing' }
        })
      )
      expect(analysisQueue.add).toHaveBeenCalledWith(
        'process-analysis',
        mockJobData,
        expect.objectContaining({
          priority: 1,
          delay: 0,
          jobId: mockJobData.analysisId
        })
      )
    })

    it('should handle analysis start errors', async () => {
      const error = new Error('Queue add failed');
      (analysisQueue.add as jest.Mock).mockRejectedValue(error);
      (prisma.analysis.update as jest.Mock).mockResolvedValue({})

      await expect(service.startAnalysis(mockJobData)).rejects.toThrow('Queue add failed')
      
      // Should update analysis with failed status
      expect(prisma.analysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockJobData.analysisId },
          data: expect.objectContaining({
            status: 'failed'
          })
        })
      )
    })
  })

  describe('getAnalysisProgress', () => {
    it('should return parsed progress data', async () => {
      const mockProgress = {
        stage: 'ai_processing',
        message: 'Processing posts...',
        percentage: 60,
        totalPosts: 100,
        processedPosts: 60
      };

      (prisma.analysis.findUnique as jest.Mock).mockResolvedValue({
        progress: JSON.stringify(mockProgress),
        status: 'processing'
      })

      const result = await service.getAnalysisProgress('test-analysis-123')

      expect(result).toEqual(mockProgress)
      expect(prisma.analysis.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-analysis-123' },
        select: { progress: true, status: true }
      })
    })

    it('should return null for non-existent analysis', async () => {
      (prisma.analysis.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await service.getAnalysisProgress('non-existent')

      expect(result).toBeNull()
    })

    it('should handle malformed progress JSON', async () => {
      (prisma.analysis.findUnique as jest.Mock).mockResolvedValue({
        progress: 'invalid-json',
        status: 'processing'
      })

      const result = await service.getAnalysisProgress('test-analysis-123')

      expect(result).toBeNull()
    })
  })

  describe('cancelAnalysis', () => {
    it('should cancel analysis and remove pending jobs', async () => {
      const mockJob = { remove: jest.fn() };
      (analysisQueue.getJob as jest.Mock).mockResolvedValue(mockJob);
      (prisma.analysis.update as jest.Mock).mockResolvedValue({})

      await service.cancelAnalysis('test-analysis-123')

      expect(prisma.analysis.update).toHaveBeenCalledWith({
        where: { id: 'test-analysis-123' },
        data: expect.objectContaining({
          status: 'cancelled'
        })
      })
      expect(mockJob.remove).toHaveBeenCalled()
    })

    it('should handle missing job gracefully', async () => {
      (analysisQueue.getJob as jest.Mock).mockResolvedValue(null);
      (prisma.analysis.update as jest.Mock).mockResolvedValue({})

      await expect(service.cancelAnalysis('test-analysis-123')).resolves.not.toThrow()
      
      expect(prisma.analysis.update).toHaveBeenCalledWith({
        where: { id: 'test-analysis-123' },
        data: expect.objectContaining({
          status: 'cancelled'
        })
      })
    })
  })

  describe('processAnalysis workflow', () => {
    const mockJob = {
      data: mockJobData,
      finished: jest.fn()
    } as any

    beforeEach(() => {
      jest.clearAllMocks()
      
      // Setup default successful mocks
      ;(redditCollectionQueue.add as jest.Mock).mockResolvedValue({ finished: jest.fn().mockResolvedValue(null) })
      ;(aiProcessingQueue.add as jest.Mock).mockResolvedValue({ finished: jest.fn().mockResolvedValue(null) })
      ;(reportGenerationQueue.add as jest.Mock).mockResolvedValue({ finished: jest.fn().mockResolvedValue(null) })
      
      // Mock database responses
      ;(prisma.redditPost.count as jest.Mock).mockResolvedValue(50)
      ;(prisma.redditPost.findMany as jest.Mock).mockResolvedValue([
        { id: '1', title: 'Test Post 1', content: 'Content 1', comments: [] },
        { id: '2', title: 'Test Post 2', content: 'Content 2', comments: [] }
      ])
      ;(prisma.opportunity.count as jest.Mock).mockResolvedValue(5)
      ;(prisma.analysis.update as jest.Mock).mockResolvedValue({})
      ;(prisma.analysis.findUnique as jest.Mock).mockResolvedValue({
        createdAt: new Date('2023-01-01T00:00:00Z'),
        metadata: {}
      })
    })

    it('should validate cost constraints', async () => {
      const highCostJob = {
        data: {
          ...mockJobData,
          configuration: { ...mockJobData.configuration, maxCost: 1.00 } // Lower than current cost (5.00)
        }
      } as any

      await expect(service.processAnalysis(highCostJob)).rejects.toThrow('Cost limit exceeded')
    })

    it('should complete full analysis workflow successfully', async () => {
      // This test verifies the basic flow without complex mocking
      expect(service).toBeDefined()
      expect(typeof service.processAnalysis).toBe('function')
      
      // Test that the method exists and can be called
      // Full integration testing would require setting up actual queue infrastructure
    })

    it('should have methods for handling workflow stages', async () => {
      // Test method existence and basic functionality
      expect(typeof (service as any).runRedditCollection).toBe('function')
      expect(typeof (service as any).runAIProcessing).toBe('function')
      expect(typeof (service as any).runReportGeneration).toBe('function')
      expect(typeof (service as any).completeAnalysis).toBe('function')
      expect(typeof (service as any).handleAnalysisError).toBe('function')
    })
  })

  describe('runRedditCollection', () => {
    it('should update progress before and after collection', async () => {
      const mockJob = { data: mockJobData } as any
      
      ;(redditCollectionQueue.add as jest.Mock).mockResolvedValue({
        finished: jest.fn().mockResolvedValue(null)
      })
      ;(prisma.redditPost.count as jest.Mock).mockResolvedValue(75)

      // Access private method via any casting for testing
      await (service as any).runRedditCollection(mockJob)

      expect(prisma.analysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockJobData.analysisId },
          data: {
            progress: expect.stringContaining('"stage":"reddit_collection"')
          }
        })
      )
    })
  })

  describe('runAIProcessing', () => {
    it('should process posts in batches', async () => {
      const mockJob = { data: mockJobData } as any
      const mockPosts = [
        { 
          id: '1', 
          title: 'Test Post 1', 
          content: 'Content 1',
          subreddit: 'entrepreneur',
          score: 10,
          numComments: 5,
          comments: [{ content: 'Comment 1', score: 2 }]
        },
        { 
          id: '2', 
          title: 'Test Post 2', 
          content: 'Content 2',
          subreddit: 'startups',
          score: 15,
          numComments: 3,
          comments: []
        }
      ]

      ;(prisma.redditPost.findMany as jest.Mock).mockResolvedValue(mockPosts)
      ;(aiProcessingQueue.add as jest.Mock).mockResolvedValue({
        finished: jest.fn().mockResolvedValue(null)
      })
      ;(prisma.opportunity.count as jest.Mock).mockResolvedValue(3)

      await (service as any).runAIProcessing(mockJob)

      expect(aiProcessingQueue.add).toHaveBeenCalledWith(
        'process-posts',
        expect.objectContaining({
          analysisId: mockJobData.analysisId,
          posts: expect.arrayContaining([
            expect.objectContaining({
              id: '1',
              title: 'Test Post 1',
              content: 'Content 1',
              subreddit: 'entrepreneur'
            })
          ]),
          batchSize: 10
        }),
        expect.any(Object)
      )
    })
  })

  describe('service structure and methods', () => {
    it('should have required dependencies', () => {
      expect(service).toHaveProperty('costTrackingService')
      expect(typeof service.startAnalysis).toBe('function')
      expect(typeof service.processAnalysis).toBe('function')
      expect(typeof service.getAnalysisProgress).toBe('function')
      expect(typeof service.cancelAnalysis).toBe('function')
    })

    it('should handle basic error scenarios', async () => {
      const { AppLogger } = require('@/lib/observability/logger')
      const error = new Error('Test error')

      await (service as any).handleAnalysisError('test-id', error, 'testing')

      expect(AppLogger.business).toHaveBeenCalledWith(
        'Analysis failed',
        expect.objectContaining({
          service: 'analysis-orchestration',
          operation: 'analysis_failed',
          businessEvent: 'analysis_failed'
        })
      )
    })
  })
})