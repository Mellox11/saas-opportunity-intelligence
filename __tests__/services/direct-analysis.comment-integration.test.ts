import { DirectAnalysisService } from '@/lib/services/direct-analysis.service'
import { prisma } from '@/lib/db'

// Mock all dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    analysis: {
      update: jest.fn(),
      findUnique: jest.fn()
    },
    redditPost: {
      findMany: jest.fn(),
      count: jest.fn().mockResolvedValue(10)
    },
    redditComment: {
      update: jest.fn(),
      updateMany: jest.fn()
    },
    opportunity: {
      count: jest.fn().mockResolvedValue(3)
    }
  }
}))

jest.mock('@/lib/services/reddit-collection.service', () => ({
  RedditCollectionService: jest.fn().mockImplementation(() => ({
    collectDataForAnalysis: jest.fn().mockResolvedValue({
      totalPosts: 10,
      totalComments: 25
    }),
    collectAndStorePosts: jest.fn().mockResolvedValue({
      postsCollected: 10,
      commentsCollected: 25
    })
  }))
}))

jest.mock('@/lib/services/ai-processing.service', () => ({
  AIProcessingService: jest.fn().mockImplementation(() => ({
    processPostsForOpportunities: jest.fn().mockResolvedValue({
      totalProcessed: 10,
      opportunitiesFound: 3
    })
  }))
}))

jest.mock('@/lib/services/comment-analysis.service', () => ({
  CommentAnalysisService: jest.fn().mockImplementation(() => ({
    batchAnalyzeComments: jest.fn().mockResolvedValue(new Map([
      ['comment1', {
        sentimentScore: 0.8,
        confidenceScore: 0.9,
        validationSignals: {
          agreement: true,
          disagreement: false,
          alternativeSolutions: []
        },
        enthusiasmLevel: 'high',
        skepticismLevel: 'low'
      }],
      ['comment2', {
        sentimentScore: -0.2,
        confidenceScore: 0.7,
        validationSignals: {
          agreement: false,
          disagreement: true,
          alternativeSolutions: ['existing tool']
        },
        enthusiasmLevel: 'low',
        skepticismLevel: 'medium'
      }]
    ]))
  }))
}))

jest.mock('@/lib/services/cost-tracking.service', () => ({
  CostTrackingService: jest.fn().mockImplementation(() => ({
    getCurrentCost: jest.fn().mockResolvedValue(5.50),
    recordCostEvent: jest.fn().mockResolvedValue({}),
    getAnalysisCostBreakdown: jest.fn().mockResolvedValue({
      total: 5.50,
      reddit: 2.50,
      ai: 3.00
    })
  }))
}))

jest.mock('@/lib/observability/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    business: jest.fn()
  }
}))

jest.mock('@/lib/middleware/correlation', () => ({
  createCorrelatedLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('DirectAnalysisService Comment Integration', () => {
  let directAnalysisService: DirectAnalysisService
  
  beforeEach(() => {
    directAnalysisService = new DirectAnalysisService()
    jest.clearAllMocks()
  })

  describe('processAnalysisDirectly with Comment Analysis', () => {
    it('should include comment analysis in the pipeline', async () => {
      const mockAnalysisData = {
        analysisId: 'test-analysis-123',
        userId: 'user-123',
        configuration: {
          subreddits: ['entrepreneur', 'startups'],
          timeRange: 30,
          keywords: {
            predefined: ['saas', 'software'],
            custom: ['mvp']
          },
          maxCost: 10.00
        }
      }

      // Mock database responses
      mockPrisma.analysis.findUnique.mockResolvedValue({
        id: 'test-analysis-123',
        userId: 'user-123',
        status: 'processing',
        estimatedCost: 8.50,
        actualCost: null,
        budgetLimit: 10.00,
        configuration: '{}',
        progress: '{}',
        metadata: '{}',
        errorDetails: null,
        resultsSummary: null,
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: null
      })

      mockPrisma.analysis.update.mockResolvedValue({} as any)

      // Mock high-scoring posts with comments
      mockPrisma.redditPost.findMany.mockResolvedValue([
        {
          id: 'post1',
          analysisId: 'test-analysis-123',
          redditId: 'reddit_post_1',
          subreddit: 'entrepreneur',
          title: 'Looking for a SaaS solution',
          content: 'Need help with project management',
          author: 'user1',
          score: 85, // Above 75 threshold
          numComments: 2,
          createdUtc: new Date(),
          url: 'https://reddit.com/post1',
          permalink: '/r/entrepreneur/post1',
          rawData: '{}',
          matchedKeywords: '["saas"]',
          processed: false,
          embeddingId: null,
          processedAt: new Date(),
          comments: [
            {
              id: 'comment1',
              postId: 'post1',
              redditId: 'comment1',
              parentId: null,
              content: 'Great idea! I would pay for this',
              author: 'commenter1',
              anonymizedAuthor: 'user_abc123',
              score: 15,
              createdUtc: new Date(),
              rawData: '{}',
              analysisMetadata: '{}',
              processingStatus: 'pending',
              embeddingId: null,
              processedAt: new Date()
            },
            {
              id: 'comment2', 
              postId: 'post1',
              redditId: 'comment2',
              parentId: null,
              content: 'Not sure this is needed',
              author: 'commenter2',
              anonymizedAuthor: 'user_def456',
              score: 3,
              createdUtc: new Date(),
              rawData: '{}',
              analysisMetadata: '{}',
              processingStatus: 'pending',
              embeddingId: null,
              processedAt: new Date()
            }
          ]
        }
      ])

      mockPrisma.redditComment.update.mockResolvedValue({} as any)

      await directAnalysisService.processAnalysisDirectly(mockAnalysisData)

      // Verify comment analysis was called
      expect(mockPrisma.redditPost.findMany).toHaveBeenCalledWith({
        where: {
          analysisId: 'test-analysis-123',
          score: {
            gte: 75 // Verify 75+ threshold
          }
        },
        include: {
          comments: {
            where: {
              processingStatus: 'pending'
            }
          }
        }
      })

      // Verify comments were updated with analysis results
      expect(mockPrisma.redditComment.update).toHaveBeenCalledWith({
        where: { redditId: 'comment1' },
        data: {
          analysisMetadata: expect.stringContaining('sentimentScore'),
          processingStatus: 'completed'
        }
      })

      expect(mockPrisma.redditComment.update).toHaveBeenCalledWith({
        where: { redditId: 'comment2' },
        data: {
          analysisMetadata: expect.stringContaining('sentimentScore'),
          processingStatus: 'completed'
        }
      })
    })

    it('should skip comment analysis when no high-scoring posts exist', async () => {
      const mockAnalysisData = {
        analysisId: 'test-analysis-123',
        userId: 'user-123',
        configuration: {
          subreddits: ['entrepreneur'],
          timeRange: 30,
          keywords: { predefined: [], custom: [] },
          maxCost: 10.00
        }
      }

      mockPrisma.analysis.findUnique.mockResolvedValue({
        id: 'test-analysis-123',
        userId: 'user-123',
        status: 'processing',
        estimatedCost: 5.00,
        actualCost: null,
        budgetLimit: 10.00,
        configuration: '{}',
        progress: '{}',
        metadata: '{}',
        errorDetails: null,
        resultsSummary: null,
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: null
      })

      mockPrisma.analysis.update.mockResolvedValue({} as any)

      // No high-scoring posts
      mockPrisma.redditPost.findMany.mockResolvedValue([])

      await directAnalysisService.processAnalysisDirectly(mockAnalysisData)

      // Verify it still looked for high-scoring posts
      expect(mockPrisma.redditPost.findMany).toHaveBeenCalledWith({
        where: {
          analysisId: 'test-analysis-123',
          score: {
            gte: 75
          }
        },
        include: {
          comments: {
            where: {
              processingStatus: 'pending'
            }
          }
        }
      })

      // Verify no comment updates were made
      expect(mockPrisma.redditComment.update).not.toHaveBeenCalled()
    })
  })
})