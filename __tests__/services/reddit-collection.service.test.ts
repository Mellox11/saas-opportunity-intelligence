import { RedditCollectionService } from '@/lib/services/reddit-collection.service'
import { ProcessedRedditPost } from '@/lib/validation/reddit-schema'

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    analysis: {
      update: jest.fn()
    },
    redditPost: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn()
    },
    redditComment: {
      createMany: jest.fn()
    }
  }
}))

// Mock Reddit Client
jest.mock('@/lib/services/reddit-client', () => ({
  RedditClient: jest.fn().mockImplementation(() => ({
    collectPostsFromSubreddits: jest.fn(),
    collectCommentsForPosts: jest.fn()
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

import { prisma } from '@/lib/db'
import { RedditClient } from '@/lib/services/reddit-client'

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockRedditClient = RedditClient as jest.MockedClass<typeof RedditClient>

describe('RedditCollectionService', () => {
  let service: RedditCollectionService
  const testAnalysisId = 'test-analysis-123'

  const mockProcessedPosts: ProcessedRedditPost[] = [
    {
      redditId: 'reddit-post-1',
      subreddit: 'entrepreneur',
      title: 'Looking for inventory management solution',
      content: 'Need help with tracking inventory across multiple locations...',
      author: 'user1',
      score: 45,
      numComments: 12,
      createdUtc: new Date('2023-01-01'),
      url: 'https://reddit.com/r/entrepreneur/post1',
      permalink: '/r/entrepreneur/post1',
      matchedKeywords: ['inventory', 'management'],
      rawData: { id: 'reddit-post-1', domain: 'reddit.com' }
    },
    {
      redditId: 'reddit-post-2',
      subreddit: 'startups',
      title: 'Team communication challenges',
      content: 'Our team is growing and need better tools...',
      author: 'user2',
      score: 23,
      numComments: 7,
      createdUtc: new Date('2023-01-02'),
      url: 'https://reddit.com/r/startups/post2',
      permalink: '/r/startups/post2',
      matchedKeywords: ['team', 'communication'],
      rawData: { id: 'reddit-post-2', domain: 'reddit.com' }
    }
  ]

  const mockComments = [
    {
      redditId: 'comment-1',
      parentId: 'reddit-post-1',
      content: 'Same problem here, would love a solution',
      author: 'commenter1',
      score: 8,
      createdUtc: new Date('2023-01-01T01:00:00'),
      rawData: { id: 'comment-1' }
    },
    {
      redditId: 'comment-2',
      parentId: 'reddit-post-1',
      content: 'Try this tool...',
      author: 'commenter2',
      score: 5,
      createdUtc: new Date('2023-01-01T02:00:00'),
      rawData: { id: 'comment-2' }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup mock implementations before service instantiation
    const mockRedditClientInstance = {
      collectPostsFromSubreddits: jest.fn().mockResolvedValue(mockProcessedPosts),
      collectCommentsForPosts: jest.fn().mockResolvedValue(
        new Map([['reddit-post-1', mockComments]])
      )
    }
    
    mockRedditClient.mockImplementation(() => mockRedditClientInstance as any)
    
    service = new RedditCollectionService(testAnalysisId)

    mockPrisma.analysis.update.mockResolvedValue({} as any)
    mockPrisma.redditPost.createMany.mockResolvedValue({ count: 2 } as any)
    mockPrisma.redditPost.findFirst.mockResolvedValue({ id: 'db-post-1' } as any)
    mockPrisma.redditComment.createMany.mockResolvedValue({ count: 2 } as any)
  })

  describe('collectAndStorePosts', () => {
    const testParams = {
      subreddits: ['entrepreneur', 'startups'],
      timeRange: 30,
      keywords: {
        predefined: ['problem', 'solution'],
        custom: ['inventory', 'management']
      }
    }

    it('should collect and store posts successfully', async () => {
      const result = await service.collectAndStorePosts(
        testParams.subreddits,
        testParams.timeRange,
        testParams.keywords
      )

      expect(result).toEqual({
        postsCollected: 2,
        commentsCollected: 2
      })
    })

    it('should update analysis status to processing initially', async () => {
      await service.collectAndStorePosts(
        testParams.subreddits,
        testParams.timeRange,
        testParams.keywords
      )

      const initialCall = mockPrisma.analysis.update.mock.calls[0]
      expect(initialCall[0]).toEqual({
        where: { id: testAnalysisId },
        data: {
          status: 'processing',
          startedAt: expect.any(Date),
          progress: expect.stringContaining('"stage":"collecting_posts"')
        }
      })
    })

    it('should call Reddit client with correct parameters', async () => {
      await service.collectAndStorePosts(
        testParams.subreddits,
        testParams.timeRange,
        testParams.keywords
      )

      const mockRedditClientInstance = mockRedditClient.mock.results[0].value
      
      expect(mockRedditClientInstance.collectPostsFromSubreddits).toHaveBeenCalledWith(
        ['entrepreneur', 'startups'],
        30,
        {
          predefined: ['problem', 'solution'],
          custom: ['inventory', 'management']
        },
        500 // Max posts per subreddit
      )
    })

    it('should store posts with correct data structure', async () => {
      await service.collectAndStorePosts(
        testParams.subreddits,
        testParams.timeRange,
        testParams.keywords
      )

      expect(mockPrisma.redditPost.createMany).toHaveBeenCalledWith({
        data: [
          {
            analysisId: testAnalysisId,
            redditId: 'reddit-post-1',
            subreddit: 'entrepreneur',
            title: 'Looking for inventory management solution',
            content: 'Need help with tracking inventory across multiple locations...',
            author: 'user1',
            score: 45,
            numComments: 12,
            createdUtc: new Date('2023-01-01'),
            url: 'https://reddit.com/r/entrepreneur/post1',
            permalink: '/r/entrepreneur/post1',
            rawData: JSON.stringify({ id: 'reddit-post-1', domain: 'reddit.com' }),
            matchedKeywords: JSON.stringify(['inventory', 'management']),
            processed: false
          },
          {
            analysisId: testAnalysisId,
            redditId: 'reddit-post-2',
            subreddit: 'startups',
            title: 'Team communication challenges',
            content: 'Our team is growing and need better tools...',
            author: 'user2',
            score: 23,
            numComments: 7,
            createdUtc: new Date('2023-01-02'),
            url: 'https://reddit.com/r/startups/post2',
            permalink: '/r/startups/post2',
            rawData: JSON.stringify({ id: 'reddit-post-2', domain: 'reddit.com' }),
            matchedKeywords: JSON.stringify(['team', 'communication']),
            processed: false
          }
        ],
        skipDuplicates: true
      })
    })

    it('should handle posts without matched keywords', async () => {
      const postsWithoutKeywords = [{
        ...mockProcessedPosts[0],
        matchedKeywords: []
      }]

      const mockRedditClientInstance = mockRedditClient.mock.results[0].value
      mockRedditClientInstance.collectPostsFromSubreddits.mockResolvedValue(postsWithoutKeywords)

      await service.collectAndStorePosts(
        testParams.subreddits,
        testParams.timeRange,
        testParams.keywords
      )

      const createCall = mockPrisma.redditPost.createMany.mock.calls[0][0]
      expect(createCall.data[0].matchedKeywords).toBeNull()
    })

    it('should collect and store comments for posts', async () => {
      await service.collectAndStorePosts(
        testParams.subreddits,
        testParams.timeRange,
        testParams.keywords
      )

      const mockRedditClientInstance = mockRedditClient.mock.results[0].value
      
      expect(mockRedditClientInstance.collectCommentsForPosts).toHaveBeenCalledWith(
        mockProcessedPosts,
        0.5, // Sample 50% of posts
        10   // Minimum score threshold
      )

      expect(mockPrisma.redditComment.createMany).toHaveBeenCalledWith({
        data: [
          {
            postId: 'db-post-1',
            redditId: 'comment-1',
            parentId: 'reddit-post-1',
            content: 'Same problem here, would love a solution',
            author: 'commenter1',
            score: 8,
            createdUtc: new Date('2023-01-01T01:00:00'),
            rawData: JSON.stringify({ id: 'comment-1' })
          },
          {
            postId: 'db-post-1',
            redditId: 'comment-2',
            parentId: 'reddit-post-1',
            content: 'Try this tool...',
            author: 'commenter2',
            score: 5,
            createdUtc: new Date('2023-01-01T02:00:00'),
            rawData: JSON.stringify({ id: 'comment-2' })
          }
        ],
        skipDuplicates: true
      })
    })

    it('should update progress throughout the collection process', async () => {
      await service.collectAndStorePosts(
        testParams.subreddits,
        testParams.timeRange,
        testParams.keywords
      )

      const updateCalls = mockPrisma.analysis.update.mock.calls
      expect(updateCalls.length).toBe(3)

      // Check progress stages
      const progressStages = updateCalls.map(call => {
        const progressStr = call[0].data.progress
        return JSON.parse(progressStr).stage
      })

      expect(progressStages).toEqual([
        'collecting_posts',
        'collecting_comments', 
        'posts_collected'
      ])
    })

    it('should handle Reddit client errors gracefully', async () => {
      const mockRedditClientInstance = mockRedditClient.mock.results[0].value
      mockRedditClientInstance.collectPostsFromSubreddits.mockRejectedValue(
        new Error('Reddit API error')
      )

      await expect(
        service.collectAndStorePosts(
          testParams.subreddits,
          testParams.timeRange,
          testParams.keywords
        )
      ).rejects.toThrow('Reddit API error')

      // Should update analysis with failed status
      expect(mockPrisma.analysis.update).toHaveBeenCalledWith({
        where: { id: testAnalysisId },
        data: {
          status: 'failed',
          errorDetails: expect.stringContaining('Reddit API error')
        }
      })
    })

    it('should handle comments collection errors gracefully', async () => {
      const mockRedditClientInstance = mockRedditClient.mock.results[0].value
      mockRedditClientInstance.collectCommentsForPosts.mockRejectedValue(
        new Error('Comments API error')
      )

      await expect(
        service.collectAndStorePosts(
          testParams.subreddits,
          testParams.timeRange,
          testParams.keywords
        )
      ).rejects.toThrow('Comments API error')
    })
  })

  describe('storeComments', () => {
    it('should skip comments for posts not found in database', async () => {
      mockPrisma.redditPost.findFirst.mockResolvedValue(null)

      const commentsMap = new Map([['non-existent-post', mockComments]])
      const result = await (service as any).storeComments(commentsMap)

      expect(result).toBe(0)
      expect(mockPrisma.redditComment.createMany).not.toHaveBeenCalled()
    })

    it('should handle empty comments map', async () => {
      const result = await (service as any).storeComments(new Map())
      expect(result).toBe(0)
    })

    it('should store comments with proper foreign key relationships', async () => {
      const commentsMap = new Map([['reddit-post-1', mockComments]])
      await (service as any).storeComments(commentsMap)

      expect(mockPrisma.redditPost.findFirst).toHaveBeenCalledWith({
        where: {
          redditId: 'reddit-post-1',
          analysisId: testAnalysisId
        }
      })
    })
  })

  describe('getCollectedPosts', () => {
    it('should retrieve posts with comments', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          title: 'Test post',
          score: 45,
          comments: [
            { id: 'comment-1', content: 'Test comment', score: 8 }
          ]
        }
      ]

      mockPrisma.redditPost.findMany.mockResolvedValue(mockPosts as any)

      const result = await service.getCollectedPosts(10)

      expect(mockPrisma.redditPost.findMany).toHaveBeenCalledWith({
        where: {
          analysisId: testAnalysisId
        },
        orderBy: {
          score: 'desc'
        },
        take: 10,
        include: {
          comments: {
            orderBy: {
              score: 'desc'
            },
            take: 5
          }
        }
      })

      expect(result).toEqual(mockPosts)
    })

    it('should handle unlimited queries when no limit provided', async () => {
      mockPrisma.redditPost.findMany.mockResolvedValue([])

      await service.getCollectedPosts()

      expect(mockPrisma.redditPost.findMany).toHaveBeenCalledWith({
        where: {
          analysisId: testAnalysisId
        },
        orderBy: {
          score: 'desc'
        },
        take: undefined,
        include: {
          comments: {
            orderBy: {
              score: 'desc'
            },
            take: 5
          }
        }
      })
    })
  })

  describe('markPostsAsProcessed', () => {
    it('should mark specified posts as processed', async () => {
      const postIds = ['post-1', 'post-2', 'post-3']
      mockPrisma.redditPost.updateMany.mockResolvedValue({ count: 3 } as any)

      await service.markPostsAsProcessed(postIds)

      expect(mockPrisma.redditPost.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: postIds
          },
          analysisId: testAnalysisId
        },
        data: {
          processed: true
        }
      })
    })

    it('should handle empty post IDs array', async () => {
      await service.markPostsAsProcessed([])

      expect(mockPrisma.redditPost.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: []
          },
          analysisId: testAnalysisId
        },
        data: {
          processed: true
        }
      })
    })
  })

  describe('integration scenarios', () => {
    it('should handle large dataset collection', async () => {
      const largePosts = Array.from({ length: 1000 }, (_, i) => ({
        ...mockProcessedPosts[0],
        redditId: `reddit-post-${i + 1}`,
        title: `Test post ${i + 1}`
      }))

      const mockRedditClientInstance = mockRedditClient.mock.results[0].value
      mockRedditClientInstance.collectPostsFromSubreddits.mockResolvedValue(largePosts)
      mockRedditClientInstance.collectCommentsForPosts.mockResolvedValue(new Map())

      const result = await service.collectAndStorePosts(['test'], 30, { predefined: [], custom: [] })

      expect(result.postsCollected).toBe(1000)
      expect(mockPrisma.redditPost.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            redditId: 'reddit-post-1'
          }),
          expect.objectContaining({
            redditId: 'reddit-post-1000'
          })
        ]),
        skipDuplicates: true
      })
    })

    it('should handle mixed success/failure in comment collection', async () => {
      const commentsMap = new Map([
        ['reddit-post-1', mockComments],
        ['reddit-post-2', []]  // Empty comments
      ])

      const mockRedditClientInstance = mockRedditClient.mock.results[0].value
      mockRedditClientInstance.collectCommentsForPosts.mockResolvedValue(commentsMap)

      // Mock different responses for different posts
      mockPrisma.redditPost.findFirst
        .mockResolvedValueOnce({ id: 'db-post-1' } as any)
        .mockResolvedValueOnce({ id: 'db-post-2' } as any)

      const result = await service.collectAndStorePosts(['test'], 30, { predefined: [], custom: [] })

      expect(result.commentsCollected).toBe(2) // Only comments from first post
    })

    it('should handle duplicate post prevention', async () => {
      // This tests that skipDuplicates is used correctly
      await service.collectAndStorePosts(['test'], 30, { predefined: [], custom: [] })

      expect(mockPrisma.redditPost.createMany).toHaveBeenCalledWith({
        data: expect.any(Array),
        skipDuplicates: true
      })
    })
  })

  describe('error recovery', () => {
    it('should provide detailed error information', async () => {
      const customError = new Error('Specific Reddit API failure')
      const mockRedditClientInstance = mockRedditClient.mock.results[0].value
      mockRedditClientInstance.collectPostsFromSubreddits.mockRejectedValue(customError)

      await expect(
        service.collectAndStorePosts(['test'], 30, { predefined: [], custom: [] })
      ).rejects.toThrow('Specific Reddit API failure')

      const errorCall = mockPrisma.analysis.update.mock.calls.find(call => 
        call[0].data.status === 'failed'
      )

      expect(errorCall).toBeDefined()
      const errorDetails = JSON.parse(errorCall![0].data.errorDetails)
      expect(errorDetails).toEqual({
        stage: 'reddit_collection',
        error: 'Specific Reddit API failure',
        timestamp: expect.any(String)
      })
    })

    it('should handle non-Error thrown objects', async () => {
      const mockRedditClientInstance = mockRedditClient.mock.results[0].value
      mockRedditClientInstance.collectPostsFromSubreddits.mockRejectedValue('String error')

      await expect(
        service.collectAndStorePosts(['test'], 30, { predefined: [], custom: [] })
      ).rejects.toBe('String error')

      const errorCall = mockPrisma.analysis.update.mock.calls.find(call => 
        call[0].data.status === 'failed'
      )

      const errorDetails = JSON.parse(errorCall![0].data.errorDetails)
      expect(errorDetails.error).toBe('Unknown error')
    })
  })
})