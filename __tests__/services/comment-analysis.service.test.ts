import { CommentAnalysisService } from '@/lib/services/comment-analysis.service'
import { RedditComment } from '@/lib/validation/reddit-schema'

// Mock AI SDK
jest.mock('ai', () => ({
  generateObject: jest.fn()
}))

// Mock OpenAI SDK
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mocked-model')
}))

// Mock logger
jest.mock('@/lib/observability/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

// Mock cost tracking service
jest.mock('@/lib/services/cost-tracking.service', () => ({
  CostTrackingService: jest.fn().mockImplementation(() => ({
    recordCostEvent: jest.fn().mockResolvedValue({})
  }))
}))

import { generateObject } from 'ai'

describe('CommentAnalysisService', () => {
  let analysisService: CommentAnalysisService
  const mockGenerateObject = generateObject as jest.MockedFunction<typeof generateObject>
  
  beforeEach(() => {
    analysisService = new CommentAnalysisService('test-analysis-id', true) // Skip cost tracking for tests
    jest.clearAllMocks()
  })

  describe('analyzeCommentSentiment', () => {
    it('should analyze comment sentiment successfully', async () => {
      const mockComment: RedditComment = {
        redditId: 'comment123',
        postId: 'post123',
        parentId: null,
        content: 'This is a great idea! I would definitely pay for this.',
        author: 'testuser',
        anonymizedAuthor: 'user_abc123',
        score: 15,
        createdUtc: new Date(),
        rawData: {}
      }

      const mockAnalysisResult = {
        sentimentScore: 0.8,
        confidenceScore: 0.9,
        validationSignals: {
          agreement: true,
          disagreement: false,
          alternativeSolutions: []
        },
        enthusiasmLevel: 'high' as const,
        skepticismLevel: 'low' as const
      }

      mockGenerateObject.mockResolvedValue(mockAnalysisResult)

      const result = await analysisService.analyzeCommentSentiment(mockComment)

      expect(result.sentimentScore).toBe(0.8)
      expect(result.confidenceScore).toBe(0.9)
      expect(result.validationSignals.agreement).toBe(true)
      expect(result.enthusiasmLevel).toBe('high')
      expect(result.skepticismLevel).toBe('low')
      expect(result.aiModel).toBe('gpt-4-turbo-preview')
      expect(result.processedAt).toBeDefined()
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0)
    })

    it('should handle AI API errors gracefully', async () => {
      const mockComment: RedditComment = {
        redditId: 'comment123',
        postId: 'post123',
        parentId: null,
        content: 'Test comment',
        author: 'testuser',
        score: 5,
        createdUtc: new Date(),
        rawData: {}
      }

      mockGenerateObject.mockRejectedValue(new Error('AI API Error'))

      const result = await analysisService.analyzeCommentSentiment(mockComment)

      // Should return fallback analysis with low confidence
      expect(result.sentimentScore).toBe(0)
      expect(result.confidenceScore).toBe(0.1)
      expect(result.validationSignals.agreement).toBe(false)
      expect(result.validationSignals.disagreement).toBe(false)
      expect(result.enthusiasmLevel).toBe('low')
      expect(result.skepticismLevel).toBe('medium')
      expect(result.aiModel).toBe('gpt-4-turbo-preview')
    })

    it('should include original post context in analysis', async () => {
      const mockComment: RedditComment = {
        redditId: 'comment123',
        postId: 'post123',
        parentId: null,
        content: 'I agree with this completely',
        author: 'testuser',
        score: 5,
        createdUtc: new Date(),
        rawData: {}
      }

      const originalPostContext = 'Looking for a tool to help manage my freelance business'

      const mockAnalysisResult = {
        sentimentScore: 0.6,
        confidenceScore: 0.8,
        validationSignals: {
          agreement: true,
          disagreement: false,
          alternativeSolutions: []
        },
        enthusiasmLevel: 'medium' as const,
        skepticismLevel: 'low' as const
      }

      mockGenerateObject.mockResolvedValue(mockAnalysisResult)

      const result = await analysisService.analyzeCommentSentiment(mockComment, originalPostContext)

      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('ORIGINAL POST CONTEXT:')
        })
      )
      expect(result.validationSignals.agreement).toBe(true)
    })
  })

  describe('batchAnalyzeComments', () => {
    it('should analyze multiple comments in batches', async () => {
      const mockComments: RedditComment[] = [
        {
          redditId: 'comment1',
          postId: 'post123',
          parentId: null,
          content: 'Great idea!',
          author: 'user1',
          score: 10,
          createdUtc: new Date(),
          rawData: {}
        },
        {
          redditId: 'comment2',
          postId: 'post123',
          parentId: null,
          content: 'Not sure about this...',
          author: 'user2',
          score: 3,
          createdUtc: new Date(),
          rawData: {}
        }
      ]

      const mockAnalysisResult1 = {
        sentimentScore: 0.7,
        confidenceScore: 0.8,
        validationSignals: {
          agreement: true,
          disagreement: false,
          alternativeSolutions: []
        },
        enthusiasmLevel: 'high' as const,
        skepticismLevel: 'low' as const
      }

      const mockAnalysisResult2 = {
        sentimentScore: -0.2,
        confidenceScore: 0.6,
        validationSignals: {
          agreement: false,
          disagreement: false,
          alternativeSolutions: []
        },
        enthusiasmLevel: 'low' as const,
        skepticismLevel: 'medium' as const
      }

      mockGenerateObject
        .mockResolvedValueOnce(mockAnalysisResult1)
        .mockResolvedValueOnce(mockAnalysisResult2)

      const results = await analysisService.batchAnalyzeComments(mockComments)

      expect(results.size).toBe(2)
      expect(results.get('comment1')?.sentimentScore).toBe(0.7)
      expect(results.get('comment2')?.sentimentScore).toBe(-0.2)
      expect(mockGenerateObject).toHaveBeenCalledTimes(2)
    })

    it('should handle partial failures in batch processing', async () => {
      const mockComments: RedditComment[] = [
        {
          redditId: 'comment1',
          postId: 'post123',
          parentId: null,
          content: 'Good comment',
          author: 'user1',
          score: 5,
          createdUtc: new Date(),
          rawData: {}
        },
        {
          redditId: 'comment2',
          postId: 'post123',
          parentId: null,
          content: 'Another comment',
          author: 'user2',
          score: 3,
          createdUtc: new Date(),
          rawData: {}
        }
      ]

      const mockAnalysisResult = {
        sentimentScore: 0.5,
        confidenceScore: 0.7,
        validationSignals: {
          agreement: true,
          disagreement: false,
          alternativeSolutions: []
        },
        enthusiasmLevel: 'medium' as const,
        skepticismLevel: 'low' as const
      }

      mockGenerateObject
        .mockResolvedValueOnce(mockAnalysisResult)
        .mockRejectedValueOnce(new Error('API Error'))

      const results = await analysisService.batchAnalyzeComments(mockComments)

      // Should have 2 results: 1 successful, 1 fallback with low confidence
      expect(results.size).toBe(2)
      expect(results.get('comment1')?.sentimentScore).toBe(0.5)
      expect(results.get('comment2')?.sentimentScore).toBe(0) // Fallback analysis
      expect(results.get('comment2')?.confidenceScore).toBe(0.1) // Low confidence for failed analysis
    })
  })

  describe('validateAnalysisMetadata', () => {
    it('should validate correct metadata', () => {
      const validMetadata = {
        sentimentScore: 0.5,
        confidenceScore: 0.8,
        validationSignals: {
          agreement: true,
          disagreement: false,
          alternativeSolutions: ['tool1', 'tool2']
        },
        enthusiasmLevel: 'medium',
        skepticismLevel: 'low'
      }

      const result = analysisService.validateAnalysisMetadata(validMetadata)

      expect(result).toEqual(expect.objectContaining(validMetadata))
    })

    it('should reject invalid metadata', () => {
      const invalidMetadata = {
        sentimentScore: 2, // Should be between -1 and 1
        confidenceScore: 0.8,
        validationSignals: {
          agreement: true,
          disagreement: false,
          alternativeSolutions: []
        },
        enthusiasmLevel: 'invalid', // Should be high/medium/low
        skepticismLevel: 'low'
      }

      const result = analysisService.validateAnalysisMetadata(invalidMetadata)

      expect(result).toBeNull()
    })
  })
})