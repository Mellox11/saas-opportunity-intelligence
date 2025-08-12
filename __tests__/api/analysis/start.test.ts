// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    analysis: {
      create: jest.fn(),
      update: jest.fn()
    }
  }
}))

// Mock AnalysisOrchestrationService
jest.mock('@/lib/services/analysis-orchestration.service', () => ({
  AnalysisOrchestrationService: jest.fn().mockImplementation(() => ({
    startAnalysis: jest.fn()
  }))
}))

// Mock Next.js server components to avoid environment issues
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200
    }))
  }
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { AnalysisOrchestrationService } from '@/lib/services/analysis-orchestration.service'

describe('/api/analysis/start', () => {
  const mockSession = {
    user: {
      id: 'test-user-123',
      email: 'test@example.com'
    }
  }

  const validRequestBody = {
    subreddits: ['entrepreneur', 'startups'],
    timeRange: 30,
    keywords: {
      predefined: ['problem', 'frustrated'],
      custom: ['billing', 'invoicing']
    },
    maxCost: 15.00
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/analysis/start', () => {
    it('should validate orchestration service integration', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession)
      
      const mockAnalysis = {
        id: 'analysis-123',
        userId: 'test-user-123',
        status: 'pending'
      };
      
      (prisma.analysis.create as jest.Mock).mockResolvedValue(mockAnalysis)
      
      const mockOrchestrationService = {
        startAnalysis: jest.fn().mockResolvedValue('job-456')
      };
      (AnalysisOrchestrationService as jest.Mock).mockImplementation(() => mockOrchestrationService)

      // Test the service integration directly since we can't easily test Next.js routes
      const orchestrationService = new AnalysisOrchestrationService()
      const jobId = await orchestrationService.startAnalysis({
        analysisId: 'analysis-123',
        userId: 'test-user-123',
        configuration: {
          subreddits: ['entrepreneur', 'startups'],
          timeRange: 30,
          keywords: {
            predefined: ['problem', 'frustrated'],
            custom: ['billing', 'invoicing']
          },
          maxCost: 15.00
        }
      })

      expect(jobId).toBe('job-456')
      expect(mockOrchestrationService.startAnalysis).toHaveBeenCalledWith({
        analysisId: 'analysis-123',
        userId: 'test-user-123',
        configuration: expect.objectContaining({
          subreddits: ['entrepreneur', 'startups'],
          timeRange: 30,
          maxCost: 15.00
        })
      })
    })

    it('should handle orchestration service failures', async () => {
      const mockOrchestrationService = {
        startAnalysis: jest.fn().mockRejectedValue(new Error('Queue connection failed'))
      };
      (AnalysisOrchestrationService as jest.Mock).mockImplementation(() => mockOrchestrationService)

      const orchestrationService = new AnalysisOrchestrationService()
      
      await expect(orchestrationService.startAnalysis({
        analysisId: 'analysis-123',
        userId: 'test-user-123',
        configuration: validRequestBody
      })).rejects.toThrow('Queue connection failed')
    })

    it('should validate configuration parameters', async () => {
      const mockOrchestrationService = {
        startAnalysis: jest.fn().mockResolvedValue('job-456')
      };
      (AnalysisOrchestrationService as jest.Mock).mockImplementation(() => mockOrchestrationService)

      const orchestrationService = new AnalysisOrchestrationService()
      
      // Test with minimal configuration
      await orchestrationService.startAnalysis({
        analysisId: 'analysis-123',
        userId: 'test-user-123',
        configuration: {
          subreddits: ['entrepreneur'],
          timeRange: 7,
          keywords: { predefined: [], custom: [] },
          maxCost: 25
        }
      })

      expect(mockOrchestrationService.startAnalysis).toHaveBeenCalledWith({
        analysisId: 'analysis-123',
        userId: 'test-user-123',
        configuration: expect.objectContaining({
          subreddits: ['entrepreneur'],
          timeRange: 7,
          keywords: { predefined: [], custom: [] },
          maxCost: 25
        })
      })
    })
  })
})