import { RedditClient } from '@/lib/services/reddit-client'
import { ProcessedRedditPost } from '@/lib/validation/reddit-schema'

// Mock fetch globally
global.fetch = jest.fn()

describe('RedditClient', () => {
  let client: RedditClient
  
  beforeEach(() => {
    client = new RedditClient('test-analysis-id', true) // Skip cost tracking in tests
    jest.clearAllMocks()
  })

  describe('fetchPosts', () => {
    it('should fetch posts from a subreddit', async () => {
      const mockResponse = {
        data: {
          after: 'next-page-token',
          before: null,
          children: [
            {
              kind: 't3',
              data: {
                id: 'post1',
                title: 'I hate dealing with customer support',
                selftext: 'It is so frustrating...',
                author: 'user1',
                score: 100,
                num_comments: 50,
                created_utc: Date.now() / 1000,
                url: 'https://reddit.com/r/test/post1',
                permalink: '/r/test/comments/post1'
              }
            }
          ]
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await client.fetchPosts('entrepreneur', 30, 100)

      expect(result.posts).toHaveLength(1)
      expect(result.posts[0].title).toBe('I hate dealing with customer support')
      expect(result.posts[0].redditId).toBe('post1')
      expect(result.after).toBe('next-page-token')
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('reddit.com/r/entrepreneur'),
        expect.objectContaining({
          headers: {
            'User-Agent': 'SaaS-Opportunity-Intelligence/1.0'
          }
        })
      )
    })

    it('should handle Reddit API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      await expect(client.fetchPosts('nonexistent', 30)).rejects.toThrow('Reddit API error: 404')
    })
  })

  describe('filterPostsByKeywords', () => {
    const samplePosts: ProcessedRedditPost[] = [
      {
        analysisId: 'test',
        redditId: '1',
        subreddit: 'test',
        title: 'I hate this problem',
        content: 'Looking for a solution',
        author: 'user1',
        score: 10,
        numComments: 5,
        createdUtc: new Date(),
        url: 'http://test.com',
        permalink: 'http://reddit.com/1',
        rawData: {},
        matchedKeywords: [],
        processed: false
      },
      {
        analysisId: 'test',
        redditId: '2',
        subreddit: 'test',
        title: 'Random post',
        content: 'No keywords here',
        author: 'user2',
        score: 5,
        numComments: 2,
        createdUtc: new Date(),
        url: 'http://test.com',
        permalink: 'http://reddit.com/2',
        rawData: {},
        matchedKeywords: [],
        processed: false
      },
      {
        analysisId: 'test',
        redditId: '3',
        subreddit: 'test',
        title: 'This is frustrating',
        content: 'I need a tool for this',
        author: 'user3',
        score: 15,
        numComments: 8,
        createdUtc: new Date(),
        url: 'http://test.com',
        permalink: 'http://reddit.com/3',
        rawData: {},
        matchedKeywords: [],
        processed: false
      }
    ]

    it('should filter posts by keywords', () => {
      const keywords = {
        predefined: ['I hate', 'frustrating'],
        custom: ['need a tool']
      }

      const filtered = client.filterPostsByKeywords(samplePosts, keywords)

      expect(filtered).toHaveLength(2)
      expect(filtered[0].redditId).toBe('1')
      expect(filtered[0].matchedKeywords).toContain('i hate')
      expect(filtered[1].redditId).toBe('3')
      expect(filtered[1].matchedKeywords).toContain('frustrating')
      expect(filtered[1].matchedKeywords).toContain('need a tool')
    })

    it('should return all posts when no keywords provided', () => {
      const keywords = {
        predefined: [],
        custom: []
      }

      const filtered = client.filterPostsByKeywords(samplePosts, keywords)
      expect(filtered).toHaveLength(3)
    })

    it('should handle case-insensitive matching', () => {
      const keywords = {
        predefined: ['I HATE'],
        custom: []
      }

      const filtered = client.filterPostsByKeywords(samplePosts, keywords)
      expect(filtered).toHaveLength(1)
      expect(filtered[0].redditId).toBe('1')
    })
  })

  describe('fetchComments', () => {
    it('should fetch and parse comments correctly', async () => {
      const mockResponse = [
        {}, // First element is the post
        {
          data: {
            children: [
              {
                kind: 't1',
                data: {
                  id: 'comment1',
                  body: 'Great point!',
                  author: 'commenter1',
                  score: 5,
                  created_utc: Date.now() / 1000,
                  parent_id: 't3_post1'
                }
              },
              {
                kind: 't1',
                data: {
                  id: 'comment2',
                  body: 'I agree',
                  author: 'commenter2',
                  score: 3,
                  created_utc: Date.now() / 1000,
                  parent_id: 't1_comment1',
                  replies: {
                    data: {
                      children: [
                        {
                          kind: 't1',
                          data: {
                            id: 'comment3',
                            body: 'Me too',
                            author: 'commenter3',
                            score: 1,
                            created_utc: Date.now() / 1000,
                            parent_id: 't1_comment2'
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
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const comments = await client.fetchComments('test', 'post1', 50)

      expect(comments).toHaveLength(3)
      expect(comments[0].content).toBe('Great point!')
      expect(comments[1].content).toBe('I agree')
      expect(comments[2].content).toBe('Me too') // Nested comment
    })

    it('should return empty array on comment fetch error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const comments = await client.fetchComments('test', 'post1', 50)
      expect(comments).toEqual([])
    })
  })

  describe('collectPostsFromSubreddits', () => {
    it('should collect posts from multiple subreddits', async () => {
      const mockResponse = {
        data: {
          after: null,
          children: [
            {
              kind: 't3',
              data: {
                id: 'post1',
                title: 'I hate this issue',
                selftext: 'Need help',
                author: 'user1',
                score: 20,
                num_comments: 10,
                created_utc: Date.now() / 1000,
                url: 'http://test.com',
                permalink: '/r/test/post1'
              }
            }
          ]
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const posts = await client.collectPostsFromSubreddits(
        ['entrepreneur', 'startups'],
        30,
        { predefined: ['I hate'], custom: [] },
        100
      )

      expect(posts.length).toBeGreaterThan(0)
      expect(global.fetch).toHaveBeenCalledTimes(2) // Once for each subreddit
    })
  })

  describe('rate limiting', () => {
    it('should track request count for rate limiting', () => {
      // Access private property for testing
      const rateLimit = (client as any).rateLimit
      
      // Initial state
      expect(rateLimit.requestCount).toBe(0)
      
      // Simulating that we can track rate limiting
      // The actual rate limiting is tested through the internal state
      expect(rateLimit.requestsPerMinute).toBe(60)
    })
  })
})