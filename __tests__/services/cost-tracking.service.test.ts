import { CostTrackingService } from '@/lib/services/cost-tracking.service'
import { CostEvent } from '@/lib/validation/cost-schema'
import { prisma } from '@/lib/db'
import { calculateAccuracy, calculateBudgetStatus, shouldTriggerCircuitBreaker } from '@/lib/utils/cost-calculator'

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    costEvent: {
      create: jest.fn(),
      findMany: jest.fn()
    },
    analysis: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn()
    }
  }
}))

// Mock cost calculator utilities
jest.mock('@/lib/utils/cost-calculator', () => ({
  calculateAccuracy: jest.fn(),
  calculateBudgetStatus: jest.fn(),
  shouldTriggerCircuitBreaker: jest.fn()
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockCalculateAccuracy = calculateAccuracy as jest.MockedFunction<typeof calculateAccuracy>
const mockCalculateBudgetStatus = calculateBudgetStatus as jest.MockedFunction<typeof calculateBudgetStatus>
const mockShouldTriggerCircuitBreaker = shouldTriggerCircuitBreaker as jest.MockedFunction<typeof shouldTriggerCircuitBreaker>

describe('CostTrackingService', () => {
  let service: CostTrackingService

  beforeEach(() => {
    service = new CostTrackingService()
    jest.clearAllMocks()
  })

  describe('recordCostEvent', () => {
    const mockEvent: CostEvent = {
      analysisId: 'analysis-123',
      eventType: 'openai_tokens',
      provider: 'openai',
      quantity: 1000,
      unitCost: 0.002,
      totalCost: 2.0,
      eventData: { model: 'gpt-4', tokens: 1000 }
    }

    beforeEach(() => {
      mockPrisma.analysis.findUnique.mockResolvedValue({
        id: 'analysis-123',
        actualCost: 5.0,
        budgetLimit: 20.0,
        progress: { stage: 'processing' }
      } as any)
      
      mockShouldTriggerCircuitBreaker.mockReturnValue(false)
    })

    it('should create cost event in database', async () => {
      await service.recordCostEvent(mockEvent)

      expect(mockPrisma.costEvent.create).toHaveBeenCalledWith({
        data: {
          analysisId: 'analysis-123',
          eventType: 'openai_tokens',
          provider: 'openai',
          quantity: 1000,
          unitCost: 0.002,
          totalCost: 2.0,
          eventData: { model: 'gpt-4', tokens: 1000 }
        }
      })
    })

    it('should update analysis cost after recording event', async () => {
      await service.recordCostEvent(mockEvent)

      expect(mockPrisma.analysis.update).toHaveBeenCalledWith({
        where: { id: 'analysis-123' },
        data: {
          actualCost: 7.0, // 5.0 + 2.0
          progress: {
            stage: 'processing',
            costAccumulation: 7.0,
            lastCostUpdate: expect.any(String)
          }
        }
      })
    })

    it('should handle event without eventData', async () => {
      const eventWithoutData = { ...mockEvent, eventData: undefined }
      
      await service.recordCostEvent(eventWithoutData)

      expect(mockPrisma.costEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventData: {}
        })
      })
    })

    it('should trigger circuit breaker when cost limit approached', async () => {
      mockShouldTriggerCircuitBreaker.mockReturnValue(true)

      await service.recordCostEvent(mockEvent)

      expect(mockPrisma.analysis.update).toHaveBeenCalledWith({
        where: { id: 'analysis-123' },
        data: {
          status: 'cancelled',
          errorDetails: {
            type: 'BUDGET_EXCEEDED',
            message: expect.stringContaining('Analysis stopped: Cost ($7.00) approaching budget limit ($20.00)'),
            timestamp: expect.any(String)
          }
        }
      })
    })

    it('should throw error if analysis not found', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue(null)

      await expect(service.recordCostEvent(mockEvent)).rejects.toThrow(
        'Analysis analysis-123 not found'
      )
    })

    it('should handle analysis with null actualCost', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue({
        id: 'analysis-123',
        actualCost: null,
        budgetLimit: 20.0,
        progress: null
      } as any)

      await service.recordCostEvent(mockEvent)

      expect(mockPrisma.analysis.update).toHaveBeenCalledWith({
        where: { id: 'analysis-123' },
        data: {
          actualCost: 2.0, // 0 + 2.0
          progress: {
            costAccumulation: 2.0,
            lastCostUpdate: expect.any(String)
          }
        }
      })
    })
  })

  describe('getCostTrackingStatus', () => {
    beforeEach(() => {
      mockCalculateBudgetStatus.mockReturnValue('within_budget')
    })

    it('should return cost tracking status for valid analysis', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue({
        actualCost: 15.5,
        estimatedCost: 20.0,
        budgetLimit: 25.0,
        progress: { stage: 'processing' },
        status: 'processing'
      } as any)

      const result = await service.getCostTrackingStatus('analysis-123')

      expect(result).toEqual({
        analysisId: 'analysis-123',
        currentCost: 15.5,
        estimatedCost: 20.0,
        budgetLimit: 25.0,
        percentComplete: 77.5, // (15.5 / 20.0) * 100
        status: 'within_budget'
      })
    })

    it('should handle analysis with null costs', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue({
        actualCost: null,
        estimatedCost: null,
        budgetLimit: null,
        progress: null,
        status: 'pending'
      } as any)

      const result = await service.getCostTrackingStatus('analysis-123')

      expect(result).toEqual({
        analysisId: 'analysis-123',
        currentCost: 0,
        estimatedCost: 0,
        budgetLimit: 0,
        percentComplete: 0,
        status: 'within_budget'
      })
    })

    it('should use estimatedCost as budgetLimit when budgetLimit is null', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue({
        actualCost: 10.0,
        estimatedCost: 20.0,
        budgetLimit: null,
        progress: null,
        status: 'processing'
      } as any)

      const result = await service.getCostTrackingStatus('analysis-123')

      expect(result.budgetLimit).toBe(20.0)
      expect(mockCalculateBudgetStatus).toHaveBeenCalledWith(10.0, 20.0)
    })

    it('should return stopped status for cancelled analysis at budget limit', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue({
        actualCost: 24.0, // 96% of budget limit
        estimatedCost: 20.0,
        budgetLimit: 25.0,
        progress: null,
        status: 'cancelled'
      } as any)

      const result = await service.getCostTrackingStatus('analysis-123')

      expect(result.status).toBe('stopped')
    })

    it('should throw error if analysis not found', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue(null)

      await expect(service.getCostTrackingStatus('analysis-123')).rejects.toThrow(
        'Analysis analysis-123 not found'
      )
    })

    it('should cap percentComplete at 100%', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue({
        actualCost: 30.0, // More than estimated
        estimatedCost: 20.0,
        budgetLimit: 40.0,
        progress: null,
        status: 'processing'
      } as any)

      const result = await service.getCostTrackingStatus('analysis-123')

      expect(result.percentComplete).toBe(100)
    })
  })

  describe('getCostEvents', () => {
    it('should return cost events for analysis ordered by creation date', async () => {
      const mockEvents = [
        { id: '1', eventType: 'openai_tokens', totalCost: 2.0, createdAt: new Date('2023-01-02') },
        { id: '2', eventType: 'reddit_api_request', totalCost: 0.5, createdAt: new Date('2023-01-01') }
      ]

      mockPrisma.costEvent.findMany.mockResolvedValue(mockEvents as any)

      const result = await service.getCostEvents('analysis-123')

      expect(mockPrisma.costEvent.findMany).toHaveBeenCalledWith({
        where: { analysisId: 'analysis-123' },
        orderBy: { createdAt: 'desc' }
      })
      expect(result).toEqual(mockEvents)
    })
  })

  describe('updateAccuracyMetrics', () => {
    beforeEach(() => {
      mockCalculateAccuracy.mockReturnValue(92.5)
    })

    it('should calculate and store accuracy metrics', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue({
        estimatedCost: 20.0,
        actualCost: 18.5
      } as any)

      const result = await service.updateAccuracyMetrics('analysis-123')

      expect(mockCalculateAccuracy).toHaveBeenCalledWith(20.0, 18.5)
      expect(mockPrisma.analysis.update).toHaveBeenCalledWith({
        where: { id: 'analysis-123' },
        data: {
          metadata: {
            costAccuracy: 92.5,
            accuracyCalculatedAt: expect.any(String)
          }
        }
      })
      expect(result).toBe(92.5)
    })

    it('should throw error if analysis not found', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue(null)

      await expect(service.updateAccuracyMetrics('analysis-123')).rejects.toThrow(
        'Cannot calculate accuracy: missing cost data'
      )
    })

    it('should throw error if estimatedCost is missing', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue({
        estimatedCost: null,
        actualCost: 18.5
      } as any)

      await expect(service.updateAccuracyMetrics('analysis-123')).rejects.toThrow(
        'Cannot calculate accuracy: missing cost data'
      )
    })

    it('should throw error if actualCost is missing', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue({
        estimatedCost: 20.0,
        actualCost: null
      } as any)

      await expect(service.updateAccuracyMetrics('analysis-123')).rejects.toThrow(
        'Cannot calculate accuracy: missing cost data'
      )
    })
  })

  describe('getHistoricalAccuracy', () => {
    beforeEach(() => {
      mockCalculateAccuracy
        .mockReturnValueOnce(95.0)
        .mockReturnValueOnce(88.0)
        .mockReturnValueOnce(92.0)
    })

    it('should calculate average accuracy from historical data', async () => {
      const mockAnalyses = [
        { estimatedCost: 20.0, actualCost: 19.0 },
        { estimatedCost: 15.0, actualCost: 13.2 },
        { estimatedCost: 25.0, actualCost: 23.0 }
      ]

      mockPrisma.analysis.findMany.mockResolvedValue(mockAnalyses as any)

      const result = await service.getHistoricalAccuracy('user-123')

      expect(mockPrisma.analysis.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          status: 'completed',
          estimatedCost: { not: null },
          actualCost: { not: null }
        },
        select: {
          estimatedCost: true,
          actualCost: true
        },
        orderBy: { completedAt: 'desc' },
        take: 100
      })

      expect(mockCalculateAccuracy).toHaveBeenCalledTimes(3)
      expect(result).toBe(91.67) // (95 + 88 + 92) / 3 = 91.67
    })

    it('should query all users when userId not provided', async () => {
      mockPrisma.analysis.findMany.mockResolvedValue([
        { estimatedCost: 20.0, actualCost: 19.0 }
      ] as any)

      await service.getHistoricalAccuracy()

      expect(mockPrisma.analysis.findMany).toHaveBeenCalledWith({
        where: {
          status: 'completed',
          estimatedCost: { not: null },
          actualCost: { not: null }
        },
        select: {
          estimatedCost: true,
          actualCost: true
        },
        orderBy: { completedAt: 'desc' },
        take: 100
      })
    })

    it('should return default accuracy when no historical data', async () => {
      mockPrisma.analysis.findMany.mockResolvedValue([])

      const result = await service.getHistoricalAccuracy('user-123')

      expect(result).toBe(85)
    })
  })

  describe('getAnalysisCostBreakdown', () => {
    it('should categorize costs by provider and event type', async () => {
      const mockEvents = [
        { eventType: 'reddit_api_request', provider: 'reddit', totalCost: 1.5 },
        { eventType: 'openai_tokens', provider: 'openai', totalCost: 5.0 },
        { eventType: 'reddit_api_request', provider: 'reddit', totalCost: 0.5 },
        { eventType: 'openai_tokens', provider: 'openai', totalCost: 3.0 },
        { eventType: 'data_processing', provider: 'custom', totalCost: 1.0 }
      ]

      mockPrisma.costEvent.findMany.mockResolvedValue(mockEvents as any)

      const result = await service.getAnalysisCostBreakdown('analysis-123')

      expect(result).toEqual({
        reddit: 2.0, // 1.5 + 0.5
        ai: 8.0,     // 5.0 + 3.0
        other: 1.0,  // 1.0
        total: 11.0  // Sum of all
      })
    })

    it('should handle empty cost events', async () => {
      mockPrisma.costEvent.findMany.mockResolvedValue([])

      const result = await service.getAnalysisCostBreakdown('analysis-123')

      expect(result).toEqual({
        reddit: 0,
        ai: 0,
        other: 0,
        total: 0
      })
    })

    it('should correctly categorize by event type when provider differs', async () => {
      const mockEvents = [
        { eventType: 'reddit_api_request', provider: 'custom', totalCost: 2.0 }, // Should go to reddit
        { eventType: 'openai_tokens', provider: 'azure', totalCost: 3.0 }         // Should go to ai
      ]

      mockPrisma.costEvent.findMany.mockResolvedValue(mockEvents as any)

      const result = await service.getAnalysisCostBreakdown('analysis-123')

      expect(result).toEqual({
        reddit: 2.0,
        ai: 3.0,
        other: 0,
        total: 5.0
      })
    })
  })

  describe('getTotalAnalysisCost', () => {
    it('should return cost breakdown with total', async () => {
      const mockEvents = [
        { eventType: 'reddit_api_request', provider: 'reddit', totalCost: 1.5 },
        { eventType: 'openai_tokens', provider: 'openai', totalCost: 5.0 }
      ]

      mockPrisma.costEvent.findMany.mockResolvedValue(mockEvents as any)

      // This method doesn't exist in the implementation but should be tested if added
      // For now, we can test getAnalysisCostBreakdown which includes total
      const result = await service.getAnalysisCostBreakdown('analysis-123')

      expect(result.total).toBe(6.5)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle floating point precision in cost calculations', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue({
        id: 'analysis-123',
        actualCost: 0.1,
        budgetLimit: 20.0,
        progress: {}
      } as any)

      const event: CostEvent = {
        analysisId: 'analysis-123',
        eventType: 'openai_tokens',
        provider: 'openai',
        quantity: 1,
        unitCost: 0.2,
        totalCost: 0.2
      }

      await service.recordCostEvent(event)

      expect(mockPrisma.analysis.update).toHaveBeenCalledWith({
        where: { id: 'analysis-123' },
        data: {
          actualCost: expect.closeTo(0.3, 5), // Handle floating point precision
          progress: expect.objectContaining({
            costAccumulation: expect.closeTo(0.3, 5)
          })
        }
      })
    })

    it('should handle very large cost values', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue({
        actualCost: 999999.99,
        estimatedCost: 1000000.00,
        budgetLimit: 1000000.00,
        progress: null,
        status: 'processing'
      } as any)

      const result = await service.getCostTrackingStatus('analysis-123')

      expect(result.currentCost).toBe(999999.99)
      expect(result.percentComplete).toBeCloseTo(100, 1) // Should cap at 100%, allow for floating point precision
    })

    it('should handle concurrent cost event recording', async () => {
      // This tests that the service can handle multiple simultaneous cost events
      mockPrisma.analysis.findUnique.mockResolvedValue({
        id: 'analysis-123',
        actualCost: 5.0,
        budgetLimit: 20.0,
        progress: {}
      } as any)

      const event1: CostEvent = {
        analysisId: 'analysis-123',
        eventType: 'openai_tokens',
        provider: 'openai',
        quantity: 100,
        unitCost: 0.01,
        totalCost: 1.0
      }

      const event2: CostEvent = {
        analysisId: 'analysis-123',
        eventType: 'reddit_api_request',
        provider: 'reddit',
        quantity: 10,
        unitCost: 0.1,
        totalCost: 1.0
      }

      // Simulate concurrent execution
      await Promise.all([
        service.recordCostEvent(event1),
        service.recordCostEvent(event2)
      ])

      expect(mockPrisma.costEvent.create).toHaveBeenCalledTimes(2)
      expect(mockPrisma.analysis.update).toHaveBeenCalledTimes(2)
    })
  })
})