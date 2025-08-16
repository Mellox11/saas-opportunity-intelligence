import { ScoringConsistencyService } from '@/lib/services/scoring-consistency.service'
import { DimensionalAnalysis } from '@/lib/types/dimensional-analysis'
import { prisma } from '@/lib/db'
import { AppLogger } from '@/lib/observability/logger'

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    analysis: {
      findUnique: jest.fn()
    },
    opportunity: {
      findMany: jest.fn()
    },
    scoringConsistencyMetrics: {
      upsert: jest.fn(),
      findMany: jest.fn()
    },
    dimensionFeedback: {
      findMany: jest.fn()
    }
  }
}))

jest.mock('@/lib/observability/logger')

describe('ScoringConsistencyService', () => {
  let service: ScoringConsistencyService
  const mockAnalysisId = 'test-analysis-123'

  const mockDimensionalAnalysis: DimensionalAnalysis = {
    persona: {
      value: 'freelancer',
      confidence: 0.85,
      evidence: ['test evidence'],
      reasoning: 'test reasoning',
      feedback: []
    },
    industryVertical: {
      value: 'creative',
      confidence: 0.80,
      evidence: ['test evidence'],
      reasoning: 'test reasoning',
      feedback: []
    },
    userRole: {
      value: 'owner',
      confidence: 0.75,
      evidence: ['test evidence'],
      reasoning: 'test reasoning',
      feedback: []
    },
    workflowStage: {
      value: 'growth',
      confidence: 0.70,
      evidence: ['test evidence'],
      reasoning: 'test reasoning',
      feedback: []
    },
    emotionLevel: {
      score: 7,
      confidence: 0.90,
      evidence: ['test evidence'],
      reasoning: 'test reasoning',
      weight: 0.15,
      feedback: []
    },
    marketSize: {
      score: 8,
      confidence: 0.85,
      evidence: ['test evidence'],
      reasoning: 'test reasoning',
      weight: 0.25,
      feedback: []
    },
    technicalComplexity: {
      score: 4,
      confidence: 0.80,
      evidence: ['test evidence'],
      reasoning: 'test reasoning',
      weight: 0.15,
      feedback: []
    },
    existingSolutions: {
      score: 6,
      confidence: 0.75,
      evidence: ['test evidence'],
      reasoning: 'test reasoning',
      weight: 0.15,
      feedback: []
    },
    budgetContext: {
      score: 6,
      confidence: 0.70,
      evidence: ['test evidence'],
      reasoning: 'test reasoning',
      weight: 0.20,
      feedback: []
    },
    timeSensitivity: {
      score: 8,
      confidence: 0.85,
      evidence: ['test evidence'],
      reasoning: 'test reasoning',
      weight: 0.10,
      feedback: []
    },
    compositeScore: 72,
    confidenceScore: 0.79,
    analysisVersion: '1.0.0',
    processingTime: 2500
  }

  beforeEach(() => {
    service = new ScoringConsistencyService()
    jest.clearAllMocks()
  })

  describe('updateConsistencyMetrics', () => {
    beforeEach(() => {
      ;(prisma.analysis.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        createdAt: new Date()
      })
      
      ;(prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
        {
          scoringDimensions: JSON.stringify({
            emotionLevel: { score: 6, confidence: 0.8 },
            marketSize: { score: 7, confidence: 0.85 }
          })
        }
      ])
      
      ;(prisma.dimensionFeedback.findMany as jest.Mock).mockResolvedValue([
        { userRating: 'positive' },
        { userRating: 'positive' },
        { userRating: 'negative' }
      ])
      
      ;(prisma.scoringConsistencyMetrics.upsert as jest.Mock).mockResolvedValue({})
    })

    it('should update metrics for all dimensions', async () => {
      await service.updateConsistencyMetrics(mockAnalysisId, mockDimensionalAnalysis)

      // Should call upsert for each dimension (10 total)
      expect(prisma.scoringConsistencyMetrics.upsert).toHaveBeenCalledTimes(10)
      
      // Verify it was called for scored dimensions
      expect(prisma.scoringConsistencyMetrics.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            analysisId_dimensionName: {
              analysisId: mockAnalysisId,
              dimensionName: 'emotionLevel'
            }
          }
        })
      )
    })

    it('should calculate average scores correctly for scored dimensions', async () => {
      await service.updateConsistencyMetrics(mockAnalysisId, mockDimensionalAnalysis)

      const emotionLevelCall = (prisma.scoringConsistencyMetrics.upsert as jest.Mock).mock.calls
        .find(call => call[0].where.analysisId_dimensionName.dimensionName === 'emotionLevel')

      expect(emotionLevelCall[0].update.averageScore).toBeCloseTo(6.5) // (6 + 7) / 2
      expect(emotionLevelCall[0].update.sampleSize).toBe(2)
    })

    it('should calculate accuracy rate from user feedback', async () => {
      await service.updateConsistencyMetrics(mockAnalysisId, mockDimensionalAnalysis)

      const updateCall = (prisma.scoringConsistencyMetrics.upsert as jest.Mock).mock.calls[0]
      expect(updateCall[0].update.accuracyRate).toBeCloseTo(66.67) // 2/3 * 100
    })

    it('should handle classification dimensions without scores', async () => {
      await service.updateConsistencyMetrics(mockAnalysisId, mockDimensionalAnalysis)

      const personaCall = (prisma.scoringConsistencyMetrics.upsert as jest.Mock).mock.calls
        .find(call => call[0].where.analysisId_dimensionName.dimensionName === 'persona')

      expect(personaCall[0].update.averageScore).toBeNull()
      expect(personaCall[0].update.standardDeviation).toBeNull()
    })

    it('should calculate standard deviation for score consistency', async () => {
      // Mock data with more variation
      ;(prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
        {
          scoringDimensions: JSON.stringify({
            emotionLevel: { score: 5, confidence: 0.8 },
            marketSize: { score: 9, confidence: 0.85 }
          })
        },
        {
          scoringDimensions: JSON.stringify({
            emotionLevel: { score: 8, confidence: 0.8 },
            marketSize: { score: 6, confidence: 0.85 }
          })
        }
      ])

      await service.updateConsistencyMetrics(mockAnalysisId, mockDimensionalAnalysis)

      const emotionLevelCall = (prisma.scoringConsistencyMetrics.upsert as jest.Mock).mock.calls
        .find(call => call[0].where.analysisId_dimensionName.dimensionName === 'emotionLevel')

      expect(emotionLevelCall[0].update.standardDeviation).toBeGreaterThan(0)
    })

    it('should handle errors gracefully', async () => {
      ;(prisma.analysis.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

      await expect(
        service.updateConsistencyMetrics(mockAnalysisId, mockDimensionalAnalysis)
      ).rejects.toThrow('Database error')

      expect(AppLogger.error).toHaveBeenCalledWith(
        'Failed to update consistency metrics',
        expect.any(Object)
      )
    })
  })

  describe('getQualityReport', () => {
    beforeEach(() => {
      ;(prisma.scoringConsistencyMetrics.findMany as jest.Mock).mockResolvedValue([
        {
          dimensionName: 'emotionLevel',
          averageScore: 7.5,
          averageConfidence: 0.85,
          standardDeviation: 1.2,
          sampleSize: 10,
          accuracyRate: 85
        },
        {
          dimensionName: 'marketSize',
          averageScore: 6.8,
          averageConfidence: 0.60,
          standardDeviation: 2.1,
          sampleSize: 8,
          accuracyRate: 65
        }
      ])
    })

    it('should generate quality report with metrics', async () => {
      const report = await service.getQualityReport(mockAnalysisId)

      expect(report.overallQuality).toBeDefined()
      expect(report.metrics).toHaveProperty('emotionLevel')
      expect(report.metrics).toHaveProperty('marketSize')
      expect(report.recommendations).toBeInstanceOf(Array)
    })

    it('should assess dimension quality correctly', async () => {
      const report = await service.getQualityReport(mockAnalysisId)

      expect(report.metrics.emotionLevel.qualityIndicator).toBe('good')
      expect(report.metrics.marketSize.qualityIndicator).toBe('warning')
    })

    it('should provide recommendations for poor quality dimensions', async () => {
      ;(prisma.scoringConsistencyMetrics.findMany as jest.Mock).mockResolvedValue([
        {
          dimensionName: 'technicalComplexity',
          averageScore: 5.0,
          averageConfidence: 0.45, // Low confidence
          standardDeviation: 1.0,
          sampleSize: 5,
          accuracyRate: 45 // Low accuracy
        }
      ])

      const report = await service.getQualityReport(mockAnalysisId)

      expect(report.recommendations.some(rec => 
        rec.includes('technicalComplexity: Low confidence scores')
      )).toBe(true)
      expect(report.recommendations.some(rec => 
        rec.includes('technicalComplexity: User feedback indicates accuracy issues')
      )).toBe(true)
    })

    it('should calculate overall quality level', async () => {
      // All good metrics
      ;(prisma.scoringConsistencyMetrics.findMany as jest.Mock).mockResolvedValue([
        {
          dimensionName: 'emotionLevel',
          averageScore: 8.0,
          averageConfidence: 0.90,
          standardDeviation: 0.8,
          sampleSize: 15,
          accuracyRate: 90
        }
      ])

      const report = await service.getQualityReport(mockAnalysisId)
      expect(report.overallQuality).toBe('high')
    })

    it('should handle empty metrics gracefully', async () => {
      ;(prisma.scoringConsistencyMetrics.findMany as jest.Mock).mockResolvedValue([])

      const report = await service.getQualityReport(mockAnalysisId)

      expect(report.overallQuality).toBe('medium')
      expect(report.metrics).toEqual({})
      expect(report.recommendations).toEqual([])
    })
  })
})