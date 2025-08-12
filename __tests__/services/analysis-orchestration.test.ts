import { AnalysisOrchestrationService, AnalysisJobData } from '@/lib/services/analysis-orchestration.service'

// Mock Bull queues
jest.mock('@/lib/queues/queue-config', () => ({
  analysisQueue: {
    add: jest.fn(),
    getJob: jest.fn()
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
    it('should validate cost constraints', async () => {
      const mockJob = {
        data: {
          ...mockJobData,
          configuration: { ...mockJobData.configuration, maxCost: 1.00 } // Lower than current cost (5.00)
        }
      } as any

      await expect(service.processAnalysis(mockJob)).rejects.toThrow('Cost limit exceeded')
    })
  })
})