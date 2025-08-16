import { RedditClient } from '@/lib/services/reddit-client'
import { ProcessedRedditPost } from '@/lib/validation/reddit-schema'

// Mock circuit breaker registry
jest.mock('@/lib/infrastructure/circuit-breaker-registry', () => ({
  circuitBreakerRegistry: {
    executeWithRedditBreaker: jest.fn((fn, fallback) => fn())
  }
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

describe('RedditClient Comment Collection', () => {
  let redditClient: RedditClient
  
  beforeEach(() => {
    redditClient = new RedditClient('test-analysis-id', true) // Skip cost tracking for tests
    jest.clearAllMocks()
  })

  describe('getPostComments', () => {
    it('should collect comments with depth limiting', async () => {
      // Mock Reddit API response
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([
          { kind: 't3', data: {} }, // Post data
          {
            kind: 'Listing',
            data: {
              children: [
                {
                  kind: 't1',
                  data: {
                    id: 'comment1',
                    parent_id: 't3_post1',
                    body: 'Top level comment',
                    author: 'user1',
                    score: 10,
                    created_utc: 1640995200,
                    replies: {
                      kind: 'Listing',
                      data: {
                        children: [
                          {
                            kind: 't1',
                            data: {
                              id: 'comment2',
                              parent_id: 't1_comment1',
                              body: 'Reply to comment',
                              author: 'user2',
                              score: 5,
                              created_utc: 1640995300,
                              replies: {
                                kind: 'Listing',
                                data: {
                                  children: [
                                    {
                                      kind: 't1',
                                      data: {
                                        id: 'comment3',
                                        parent_id: 't1_comment2',
                                        body: 'Deep nested reply',
                                        author: 'user3',
                                        score: 2,
                                        created_utc: 1640995400,
                                        replies: null
                                      }
                                    }
                                  ]
                                }
                              }
                            }
                          }
                        ]
                      }
                    }
                  }
                }
              ]
            }
          }
        ])
      }

      global.fetch = jest.fn().mockResolvedValue(mockResponse)

      const result = await redditClient.getPostComments('post1', {
        subreddit: 'test',
        depth: 3,
        limit: 100,
        sort: 'top'
      })

      expect(result.comments).toHaveLength(3)
      expect(result.totalCount).toBe(3)
      expect(result.processedLevels).toBeGreaterThanOrEqual(0)
      
      // Verify comment structure
      expect(result.comments[0].redditId).toBe('comment1')
      expect(result.comments[0].parentId).toBe('post1') // t3_ prefix removed
      expect(result.comments[1].redditId).toBe('comment2')
      expect(result.comments[1].parentId).toBe('comment1') // t1_ prefix removed
      expect(result.comments[2].redditId).toBe('comment3')
      expect(result.comments[2].parentId).toBe('comment2')
    })

    it('should respect depth limits', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([
          { kind: 't3', data: {} },
          {
            kind: 'Listing',
            data: {
              children: [
                {
                  kind: 't1',
                  data: {
                    id: 'comment1',
                    parent_id: 't3_post1',
                    body: 'Top level',
                    author: 'user1',
                    score: 10,
                    created_utc: 1640995200,
                    replies: {
                      kind: 'Listing',
                      data: {
                        children: [
                          {
                            kind: 't1',
                            data: {
                              id: 'comment2',
                              parent_id: 't1_comment1',
                              body: 'Level 2',
                              author: 'user2',
                              score: 5,
                              created_utc: 1640995300,
                              replies: {
                                kind: 'Listing',
                                data: {
                                  children: [
                                    {
                                      kind: 't1',
                                      data: {
                                        id: 'comment3',
                                        parent_id: 't1_comment2',
                                        body: 'Level 3 - should be excluded',
                                        author: 'user3',
                                        score: 2,
                                        created_utc: 1640995400,
                                        replies: null
                                      }
                                    }
                                  ]
                                }
                              }
                            }
                          }
                        ]
                      }
                    }
                  }
                }
              ]
            }
          }
        ])
      }

      global.fetch = jest.fn().mockResolvedValue(mockResponse)

      // Test with depth limit of 2
      const result = await redditClient.getPostComments('post1', {
        subreddit: 'test',
        depth: 2,
        limit: 100
      })

      // Should only get 2 comments (levels 0 and 1), not level 2
      expect(result.comments).toHaveLength(2)
      expect(result.comments.find(c => c.redditId === 'comment3')).toBeUndefined()
    })

    it('should handle API errors gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      })

      await expect(redditClient.getPostComments('post1', { subreddit: 'test' }))
        .rejects.toThrow('Reddit API error: 429 Too Many Requests')
    })

    it('should handle empty responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([])
      })

      const result = await redditClient.getPostComments('post1', { subreddit: 'test' })

      expect(result.comments).toHaveLength(0)
      expect(result.totalCount).toBe(0)
      expect(result.processedLevels).toBe(0)
    })
  })

  describe('collectCommentsForPosts', () => {
    it('should collect comments for high-scoring posts', async () => {
      const posts: ProcessedRedditPost[] = [
        {
          analysisId: 'test-analysis',
          redditId: 'post1',
          subreddit: 'test',
          title: 'High scoring post',
          content: 'Content',
          author: 'user1',
          score: 85, // Above threshold
          numComments: 10,
          createdUtc: new Date(),
          url: 'https://reddit.com/post1',
          permalink: '/r/test/post1',
          rawData: {},
          matchedKeywords: [],
          processed: false
        },
        {
          analysisId: 'test-analysis',
          redditId: 'post2',
          subreddit: 'test',
          title: 'Low scoring post',
          content: 'Content',
          author: 'user2',
          score: 50, // Below threshold
          numComments: 5,
          createdUtc: new Date(),
          url: 'https://reddit.com/post2',
          permalink: '/r/test/post2',
          rawData: {},
          matchedKeywords: [],
          processed: false
        }
      ]

      // Mock successful comment collection
      const mockGetPostComments = jest.fn().mockResolvedValue({
        comments: [
          {
            redditId: 'comment1',
            postId: 'post1',
            parentId: null,
            content: 'Great idea!',
            author: 'commenter1',
            score: 5,
            createdUtc: new Date(),
            rawData: {}
          }
        ],
        totalCount: 1,
        processedLevels: 1
      })

      redditClient.getPostComments = mockGetPostComments

      const result = await redditClient.collectCommentsForPosts(posts, {
        scoreThreshold: 75,
        maxDepth: 3,
        maxCommentsPerPost: 100
      })

      // Should only process the high-scoring post
      expect(result.size).toBe(1)
      expect(result.has('post1')).toBe(true)
      expect(result.has('post2')).toBe(false)
      
      const postComments = result.get('post1')
      expect(postComments?.comments).toHaveLength(1)
      expect(postComments?.metadata.totalCount).toBe(1)
      expect(postComments?.metadata.processedLevels).toBe(1)
    })

    it('should handle default score threshold of 75', async () => {
      const posts: ProcessedRedditPost[] = [
        {
          analysisId: 'test-analysis',
          redditId: 'post1',
          subreddit: 'test',
          title: 'Medium scoring post',
          content: 'Content',
          author: 'user1',
          score: 70, // Below default threshold of 75
          numComments: 10,
          createdUtc: new Date(),
          url: 'https://reddit.com/post1',
          permalink: '/r/test/post1',
          rawData: {},
          matchedKeywords: [],
          processed: false
        }
      ]

      redditClient.getPostComments = jest.fn().mockResolvedValue({
        comments: [],
        totalCount: 0,
        processedLevels: 0
      })

      const result = await redditClient.collectCommentsForPosts(posts) // No options = default threshold 75

      expect(result.size).toBe(0) // No posts meet default threshold
    })
  })
})