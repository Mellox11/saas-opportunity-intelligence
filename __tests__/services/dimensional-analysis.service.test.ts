import { DimensionalAnalysisService } from '@/lib/services/dimensional-analysis.service'
import { generateObject } from 'ai'
import { AppLogger } from '@/lib/observability/logger'
import { CostTrackingService } from '@/lib/services/cost-tracking.service'
import { CommentAnalysisMetadata } from '@/lib/validation/reddit-schema'

// Mock dependencies
jest.mock('ai')
jest.mock('@/lib/observability/logger')
jest.mock('@/lib/utils/cost-calculator', () => ({
  calculateEventCost: jest.fn(() => 0.012)
}))
jest.mock('@/lib/jobs/analysis-job-trigger', () => ({
  cancelAnalysisJob: jest.fn()
}))
jest.mock('@/lib/queues/queue-config', () => ({
  analysisQueue: null
}))
jest.mock('@/lib/services/cost-tracking.service')

describe('DimensionalAnalysisService', () => {
  let service: DimensionalAnalysisService
  const mockAnalysisId = 'test-analysis-123'
  
  const mockGenerateObject = generateObject as jest.MockedFunction<typeof generateObject>
  const mockRecordCostEvent = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup cost tracking mock
    ;(CostTrackingService as jest.Mock).mockImplementation(() => ({
      recordCostEvent: mockRecordCostEvent
    }))

    service = new DimensionalAnalysisService(mockAnalysisId)
  })

  describe('analyzeDimensions', () => {
    const sampleContent = `I'm a freelance graphic designer struggling with client management. 
    I spend hours tracking invoices, chasing payments, and managing project timelines. 
    It's extremely frustrating and affecting my ability to take on new clients. 
    I've tried spreadsheets but they're not scalable. 
    My business is growing and I need a better solution urgently.
    I'm willing to pay $50-100/month for something that actually works.`
    
    const sampleTitle = 'Freelancer looking for client management solution'

    const mockAIResponse = {
      classifications: {
        persona: {
          value: 'freelance-designer',
          confidence: 0.92,
          evidence: ["I'm a freelance graphic designer"],
          reasoning: 'User explicitly identifies as freelance graphic designer'
        },
        industryVertical: {
          value: 'creative-services',
          confidence: 0.88,
          evidence: ['graphic designer', 'managing project timelines'],
          reasoning: 'Clear creative services industry'
        },
        userRole: {
          value: 'business-owner',
          confidence: 0.90,
          evidence: ['My business is growing', 'take on new clients'],
          reasoning: 'Freelancer operating as business owner'
        },
        workflowStage: {
          value: 'solution-research',
          confidence: 0.85,
          evidence: ["I've tried spreadsheets", 'need a better solution'],
          reasoning: 'Actively looking for solutions after trying alternatives'
        }
      },
      scores: {
        emotionLevel: {
          score: 8,
          confidence: 0.90,
          evidence: ['extremely frustrating', 'affecting my ability'],
          reasoning: 'High frustration level expressed'
        },
        marketSize: {
          score: 7,
          confidence: 0.82,
          evidence: ['freelance graphic designer', 'business is growing'],
          reasoning: 'Large freelance market'
        },
        technicalComplexity: {
          score: 4,
          confidence: 0.78,
          evidence: ['client management', 'tracking invoices'],
          reasoning: 'Standard business management features'
        },
        existingSolutions: {
          score: 7,
          confidence: 0.85,
          evidence: ["I've tried spreadsheets"],
          reasoning: 'Many existing solutions in market'
        },
        budgetContext: {
          score: 7,
          confidence: 0.88,
          evidence: ['willing to pay $50-100/month'],
          reasoning: 'Clear budget specified'
        },
        timeSensitivity: {
          score: 8,
          confidence: 0.86,
          evidence: ['need a better solution urgently'],
          reasoning: 'Explicit urgency expressed'
        }
      }
    }

    it('should successfully analyze dimensions with high confidence', async () => {
      mockGenerateObject.mockResolvedValueOnce(mockAIResponse)

      const result = await service.analyzeDimensions(sampleContent, sampleTitle)

      // Verify AI was called with correct parameters
      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(Object),
          schema: expect.any(Object),
          prompt: expect.stringContaining('POST TITLE: ' + sampleTitle),
          temperature: 0.3
        })
      )

      // Verify classifications
      expect(result.persona.value).toBe('freelance-designer')
      expect(result.persona.confidence).toBe(0.92)
      expect(result.industryVertical.value).toBe('creative-services')
      expect(result.userRole.value).toBe('business-owner')
      expect(result.workflowStage.value).toBe('solution-research')

      // Verify scores
      expect(result.emotionLevel.score).toBe(8)
      expect(result.marketSize.score).toBe(7)
      expect(result.technicalComplexity.score).toBe(4)
      expect(result.existingSolutions.score).toBe(7)
      expect(result.budgetContext.score).toBe(7)
      expect(result.timeSensitivity.score).toBe(8)

      // Verify composite score calculation (with inverted complexity and competition)
      // emotionLevel: 8 * 0.15 = 1.2
      // marketSize: 7 * 0.25 = 1.75
      // technicalComplexity: (11-4) * 0.15 = 7 * 0.15 = 1.05
      // existingSolutions: (11-7) * 0.15 = 4 * 0.15 = 0.6
      // budgetContext: 7 * 0.20 = 1.4
      // timeSensitivity: 8 * 0.10 = 0.8
      // Total: 6.8 * 10 = 68
      expect(result.compositeScore).toBe(68)

      // Verify metadata
      expect(result.confidenceScore).toBeCloseTo(0.85, 1)
      expect(result.analysisVersion).toBe('1.0.0')
      expect(result.processingTime).toBeGreaterThanOrEqual(0)
      expect(result.createdAt).toBeInstanceOf(Date)

      // Verify cost tracking
      expect(mockRecordCostEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          analysisId: mockAnalysisId,
          eventType: 'openai_tokens',
          provider: 'openai',
          quantity: 2000
        })
      )
    })

    it('should include comment context when provided', async () => {
      const commentContext: CommentAnalysisMetadata[] = [
        {
          sentimentScore: 0.8,
          enthusiasmLevel: 'high',
          validationSignals: {
            agreement: true,
            disagreement: false,
            alternativeSolutions: ['Notion', 'Airtable']
          },
          confidenceScore: 0.85
        },
        {
          sentimentScore: -0.5,
          enthusiasmLevel: 'low',
          validationSignals: {
            agreement: false,
            disagreement: true,
            alternativeSolutions: []
          },
          confidenceScore: 0.75
        }
      ]

      mockGenerateObject.mockResolvedValueOnce(mockAIResponse)

      await service.analyzeDimensions(sampleContent, sampleTitle, commentContext)

      // Verify prompt includes comment context
      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('COMMENT CONTEXT')
        })
      )
      
      const promptCall = mockGenerateObject.mock.calls[0][0]
      expect(promptCall.prompt).toContain('2 comments analyzed')
      expect(promptCall.prompt).toContain('Positive sentiment: 1 comments')
      expect(promptCall.prompt).toContain('Alternative solutions mentioned: Notion, Airtable')
    })

    it('should handle missing information gracefully', async () => {
      const vagueContent = 'I need help with something for my business'
      const vagueTitle = 'Help needed'

      const lowConfidenceResponse = {
        ...mockAIResponse,
        classifications: {
          ...mockAIResponse.classifications,
          persona: {
            value: 'unknown',
            confidence: 0.3,
            evidence: ['business'],
            reasoning: 'Insufficient information to determine specific persona'
          },
          industryVertical: {
            value: 'general',
            confidence: 0.4,
            evidence: ['business'],
            reasoning: 'General business, no specific industry indicators'
          },
          userRole: {
            value: 'unknown',
            confidence: 0.3,
            evidence: ['business'],
            reasoning: 'Unclear role in business'
          },
          workflowStage: {
            value: 'problem-identification',
            confidence: 0.5,
            evidence: ['need help'],
            reasoning: 'Vague problem identification stage'
          }
        },
        scores: {
          ...mockAIResponse.scores,
          emotionLevel: {
            score: 5,
            confidence: 0.4,
            evidence: ['need help'],
            reasoning: 'Neutral emotion, no clear frustration signals'
          },
          marketSize: {
            score: 5,
            confidence: 0.3,
            evidence: ['business'],
            reasoning: 'Unclear market size from limited information'
          },
          technicalComplexity: {
            score: 5,
            confidence: 0.4,
            evidence: ['something'],
            reasoning: 'Unknown complexity level'
          },
          existingSolutions: {
            score: 5,
            confidence: 0.3,
            evidence: ['help'],
            reasoning: 'No indication of existing solutions'
          },
          budgetContext: {
            score: 5,
            confidence: 0.4,
            evidence: ['business'],
            reasoning: 'No budget indicators'
          },
          timeSensitivity: {
            score: 5,
            confidence: 0.3,
            evidence: ['need'],
            reasoning: 'No urgency indicators'
          }
        }
      }

      mockGenerateObject.mockResolvedValueOnce(lowConfidenceResponse)

      const result = await service.analyzeDimensions(vagueContent, vagueTitle)

      expect(result.persona.value).toBe('unknown')
      expect(result.persona.confidence).toBe(0.3)
      expect(result.emotionLevel.score).toBe(5)
      expect(result.emotionLevel.confidence).toBe(0.4)
      
      // Overall confidence should be (0.3+0.4+0.3+0.5+0.4+0.3+0.4+0.3+0.4+0.3)/10 = 0.36
      expect(result.confidenceScore).toBeCloseTo(0.36, 2)

      // Should log warning about low confidence
      expect(AppLogger.warn).toHaveBeenCalledWith(
        'Dimensional analysis below confidence threshold',
        expect.any(Object)
      )
    })

    it('should return fallback analysis on error', async () => {
      const errorMessage = 'AI service unavailable'
      mockGenerateObject.mockRejectedValueOnce(new Error(errorMessage))

      const result = await service.analyzeDimensions(sampleContent, sampleTitle)

      // Verify fallback values
      expect(result.persona.value).toBe('unknown')
      expect(result.persona.confidence).toBe(0.1)
      expect(result.persona.reasoning).toBe('Analysis failed, using fallback')
      
      expect(result.emotionLevel.score).toBe(5)
      expect(result.emotionLevel.confidence).toBe(0.1)
      
      expect(result.compositeScore).toBe(50)
      expect(result.confidenceScore).toBe(0.1)

      // Verify error logging
      expect(AppLogger.error).toHaveBeenCalledWith(
        'Dimensional analysis failed',
        expect.objectContaining({
          metadata: expect.objectContaining({
            error: errorMessage
          })
        })
      )
    })

    it('should skip cost tracking when disabled', async () => {
      const serviceNoCost = new DimensionalAnalysisService(mockAnalysisId, true)
      mockGenerateObject.mockResolvedValueOnce(mockAIResponse)

      await serviceNoCost.analyzeDimensions(sampleContent, sampleTitle)

      expect(mockRecordCostEvent).not.toHaveBeenCalled()
    })

    it('should handle edge cases in composite score calculation', async () => {
      const extremeScores = {
        ...mockAIResponse,
        scores: {
          emotionLevel: { score: 10, confidence: 0.9, evidence: [], reasoning: '' },
          marketSize: { score: 10, confidence: 0.9, evidence: [], reasoning: '' },
          technicalComplexity: { score: 1, confidence: 0.9, evidence: [], reasoning: '' },
          existingSolutions: { score: 1, confidence: 0.9, evidence: [], reasoning: '' },
          budgetContext: { score: 10, confidence: 0.9, evidence: [], reasoning: '' },
          timeSensitivity: { score: 10, confidence: 0.9, evidence: [], reasoning: '' }
        }
      }

      mockGenerateObject.mockResolvedValueOnce(extremeScores)

      const result = await service.analyzeDimensions(sampleContent, sampleTitle)

      // Maximum possible score (best case scenario)
      // emotionLevel: 10 * 0.15 = 1.5
      // marketSize: 10 * 0.25 = 2.5
      // technicalComplexity: (11-1) * 0.15 = 10 * 0.15 = 1.5
      // existingSolutions: (11-1) * 0.15 = 10 * 0.15 = 1.5
      // budgetContext: 10 * 0.20 = 2.0
      // timeSensitivity: 10 * 0.10 = 1.0
      // Total: 10.0 * 10 = 100
      expect(result.compositeScore).toBe(100)
    })

    it('should validate quality thresholds', async () => {
      // Test processing time threshold
      const slowResponse = { ...mockAIResponse }
      mockGenerateObject.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return slowResponse
      })

      const startTime = Date.now()
      const result = await service.analyzeDimensions(sampleContent, sampleTitle)
      const processingTime = Date.now() - startTime

      expect(result.processingTime).toBeGreaterThanOrEqual(100)
      
      // If processing time exceeds threshold, should log warning
      if (processingTime > 30000) {
        expect(AppLogger.warn).toHaveBeenCalledWith(
          'Dimensional analysis exceeded processing time limit',
          expect.any(Object)
        )
      }
    })

    it('should calculate average enthusiasm correctly', async () => {
      const mixedComments: CommentAnalysisMetadata[] = [
        { sentimentScore: 0.8, enthusiasmLevel: 'high', validationSignals: {}, confidenceScore: 0.9 },
        { sentimentScore: 0.5, enthusiasmLevel: 'medium', validationSignals: {}, confidenceScore: 0.8 },
        { sentimentScore: -0.3, enthusiasmLevel: 'low', validationSignals: {}, confidenceScore: 0.7 },
        { sentimentScore: 0.6, enthusiasmLevel: 'high', validationSignals: {}, confidenceScore: 0.85 }
      ]

      mockGenerateObject.mockResolvedValueOnce(mockAIResponse)

      await service.analyzeDimensions(sampleContent, sampleTitle, mixedComments)

      const promptCall = mockGenerateObject.mock.calls[0][0]
      // Average: (3 + 2 + 1 + 3) / 4 = 2.25 => "Medium"
      expect(promptCall.prompt).toContain('Average enthusiasm: Medium')
    })

    it('should extract unique alternative solutions from comments', async () => {
      const commentsWithAlternatives: CommentAnalysisMetadata[] = [
        {
          sentimentScore: 0.5,
          enthusiasmLevel: 'medium',
          validationSignals: {
            alternativeSolutions: ['Notion', 'Airtable']
          },
          confidenceScore: 0.8
        },
        {
          sentimentScore: 0.3,
          enthusiasmLevel: 'medium',
          validationSignals: {
            alternativeSolutions: ['Airtable', 'Monday.com'] // Duplicate Airtable
          },
          confidenceScore: 0.75
        }
      ]

      mockGenerateObject.mockResolvedValueOnce(mockAIResponse)

      await service.analyzeDimensions(sampleContent, sampleTitle, commentsWithAlternatives)

      const promptCall = mockGenerateObject.mock.calls[0][0]
      expect(promptCall.prompt).toContain('Alternative solutions mentioned: Notion, Airtable, Monday.com')
    })
  })

  describe('confidence score calculation', () => {
    it('should calculate overall confidence as average of all dimensions', async () => {
      const varyingConfidenceResponse = {
        classifications: {
          persona: { value: 'test', confidence: 0.9, evidence: [], reasoning: '' },
          industryVertical: { value: 'test', confidence: 0.8, evidence: [], reasoning: '' },
          userRole: { value: 'test', confidence: 0.7, evidence: [], reasoning: '' },
          workflowStage: { value: 'test', confidence: 0.6, evidence: [], reasoning: '' }
        },
        scores: {
          emotionLevel: { score: 5, confidence: 0.95, evidence: [], reasoning: '' },
          marketSize: { score: 5, confidence: 0.85, evidence: [], reasoning: '' },
          technicalComplexity: { score: 5, confidence: 0.75, evidence: [], reasoning: '' },
          existingSolutions: { score: 5, confidence: 0.65, evidence: [], reasoning: '' },
          budgetContext: { score: 5, confidence: 0.55, evidence: [], reasoning: '' },
          timeSensitivity: { score: 5, confidence: 0.45, evidence: [], reasoning: '' }
        }
      }

      mockGenerateObject.mockResolvedValueOnce(varyingConfidenceResponse)

      const result = await service.analyzeDimensions('test content', 'test title')

      // Average: (0.9 + 0.8 + 0.7 + 0.6 + 0.95 + 0.85 + 0.75 + 0.65 + 0.55 + 0.45) / 10 = 0.72
      expect(result.confidenceScore).toBeCloseTo(0.72, 2)
    })
  })
})