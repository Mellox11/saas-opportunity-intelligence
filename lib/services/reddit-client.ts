import { RedditListing, ProcessedRedditPost, RedditComment } from '@/lib/validation/reddit-schema'
import { CostTrackingService } from '@/lib/services/cost-tracking.service'
import { CommentPrivacyService } from '@/lib/services/comment-privacy.service'
import { calculateEventCost } from '@/lib/utils/cost-calculator'
import { circuitBreakerRegistry } from '@/lib/infrastructure/circuit-breaker-registry'
import { AppLogger } from '@/lib/observability/logger'

export class RedditClient {
  private readonly baseUrl = 'https://www.reddit.com'
  private readonly userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  private readonly rateLimit = {
    requestsPerMinute: 30, // More conservative rate limiting
    lastRequestTime: 0,
    requestCount: 0,
    minDelay: 2000 // Minimum 2 seconds between requests
  }
  private costTrackingService: CostTrackingService | null
  private privacyService: CommentPrivacyService

  constructor(private analysisId?: string, skipCostTracking: boolean = false) {
    this.costTrackingService = skipCostTracking ? null : new CostTrackingService()
    this.privacyService = new CommentPrivacyService()
  }

  /**
   * Rate limiting to respect Reddit API limits
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.rateLimit.lastRequestTime
    
    // Enforce minimum delay between requests
    if (timeSinceLastRequest < this.rateLimit.minDelay) {
      const waitTime = this.rateLimit.minDelay - timeSinceLastRequest
      console.log(`⏳ Waiting ${waitTime}ms before next Reddit request...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    // Reset counter every minute
    if (timeSinceLastRequest > 60000) {
      this.rateLimit.requestCount = 0
      this.rateLimit.lastRequestTime = now
    }
    
    // If we've hit the rate limit, wait
    if (this.rateLimit.requestCount >= this.rateLimit.requestsPerMinute) {
      const waitTime = 60000 - timeSinceLastRequest
      console.log(`⏳ Rate limit reached, waiting ${waitTime}ms...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      this.rateLimit.requestCount = 0
      this.rateLimit.lastRequestTime = Date.now()
    }
    
    this.rateLimit.requestCount++
    this.rateLimit.lastRequestTime = Date.now()
  }

  /**
   * Track Reddit API cost for each request
   */
  private async trackRedditCost(): Promise<void> {
    if (!this.analysisId || !this.costTrackingService) return
    
    try {
      await this.costTrackingService.recordCostEvent({
        analysisId: this.analysisId,
        eventType: 'reddit_api_request',
        provider: 'reddit',
        quantity: 1,
        unitCost: calculateEventCost('reddit_api_request', 1),
        totalCost: calculateEventCost('reddit_api_request', 1),
        eventData: {
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Failed to track Reddit API cost:', error)
    }
  }

  /**
   * Fetch posts from a subreddit using the /new endpoint for complete data
   */
  async fetchPosts(
    subreddit: string,
    timeRange: number,
    limit: number = 100,
    after?: string | null
  ): Promise<{ posts: ProcessedRedditPost[], after: string | null }> {
    return circuitBreakerRegistry.executeWithRedditBreaker(
      async () => {
        await this.enforceRateLimit()
        
        // Use /new.json to get ALL recent posts, not just top posts
        const url = `${this.baseUrl}/r/${subreddit}/new.json?limit=${limit}${after ? `&after=${after}` : ''}&raw_json=1`
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
          }
        })
        
        await this.trackRedditCost()
        
        if (!response.ok) {
          throw new Error(`Reddit API error: ${response.status} ${response.statusText}`)
        }
        
        const data: RedditListing = await response.json()
        
        const posts: ProcessedRedditPost[] = data.data.children
          .filter(child => child.kind === 't3') // t3 = posts
          .map(child => this.transformRedditPost(child.data, subreddit))
        
        AppLogger.info('Reddit posts fetched successfully', {
          service: 'reddit-client',
          operation: 'fetch_posts',
          metadata: {
            subreddit,
            postCount: posts.length,
            hasMore: !!data.data.after
          }
        })
        
        return {
          posts,
          after: data.data.after
        }
      },
      async () => {
        // Fallback: return empty result with warning
        AppLogger.warn('Reddit API circuit breaker active, returning empty results', {
          service: 'reddit-client',
          operation: 'fetch_posts_fallback',
          metadata: {
            subreddit
          }
        })
        
        return {
          posts: [],
          after: null
        }
      }
    )
  }

  /**
   * Enhanced comment collection method with depth limiting and pagination support
   * AC: 1, 6 - Handles nested comment threads up to 3 levels deep with reasonable limits
   */
  async getPostComments(
    postId: string,
    options: {
      subreddit?: string // Subreddit name (required for URL construction)
      depth?: number // Max 3 levels
      limit?: number // Comments per level  
      sort?: 'top' | 'best' | 'new'
    } = {}
  ): Promise<{
    comments: RedditComment[]
    totalCount: number
    processedLevels: number
  }> {
    return circuitBreakerRegistry.executeWithRedditBreaker(
      async () => {
        const { subreddit, depth = 3, limit = 100, sort = 'top' } = options
        
        // Ensure depth doesn't exceed 3 levels for cost control
        const maxDepth = Math.min(depth, 3)
        
        await this.enforceRateLimit()
        
        // Use provided subreddit or attempt to derive it
        const subredditName = subreddit || await this.getSubredditForPost(postId)
        
        const url = `${this.baseUrl}/r/${subredditName}/comments/${postId}.json?limit=${limit}&sort=${sort}&raw_json=1`
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
          }
        })
        
        await this.trackRedditCost()
        
        if (!response.ok) {
          throw new Error(`Reddit API error: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        
        // Reddit returns array with [post, comments]
        if (!Array.isArray(data) || data.length < 2) {
          return { comments: [], totalCount: 0, processedLevels: 0 }
        }
        
        const commentsListing = data[1]
        const comments: RedditComment[] = []
        let processedLevels = 0
        
        if (commentsListing.data?.children) {
          processedLevels = this.extractCommentsWithDepth(
            commentsListing.data.children, 
            comments, 
            postId, 
            0, 
            maxDepth
          )
        }
        
        AppLogger.info('Comments collected successfully', {
          service: 'reddit-client',
          operation: 'get_post_comments',
          metadata: {
            postId,
            subreddit: subredditName,
            totalCount: comments.length,
            processedLevels,
            maxDepth
          }
        })
        
        return {
          comments,
          totalCount: comments.length,
          processedLevels
        }
      },
      async () => {
        // Fallback: return empty result with warning
        AppLogger.warn('Reddit API circuit breaker active, returning empty comment results', {
          service: 'reddit-client',
          operation: 'get_post_comments_fallback',
          metadata: { postId }
        })
        
        return { comments: [], totalCount: 0, processedLevels: 0 }
      }
    )
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use getPostComments instead
   */
  async fetchComments(
    subreddit: string,
    postId: string,
    limit: number = 50
  ): Promise<RedditComment[]> {
    const result = await this.getPostComments(postId, { limit })
    return result.comments
  }

  /**
   * Get subreddit name for a given post ID (helper method)
   * In production, this would query the database or use context
   */
  private async getSubredditForPost(postId: string): Promise<string> {
    // For the enhanced implementation, we'll need to pass subreddit context
    // or query from the database. For now, return a placeholder.
    // This will be enhanced when we integrate with the orchestration service
    return 'unknown'
  }

  /**
   * Enhanced comment extraction with depth control
   * AC: 1.2 - Implements nested comment traversal up to 3 levels deep
   */
  private extractCommentsWithDepth(
    children: any[], 
    comments: RedditComment[], 
    postId: string, 
    currentDepth: number = 0, 
    maxDepth: number = 3
  ): number {
    let maxLevelReached = currentDepth

    for (const child of children) {
      if (child.kind === 't1' && currentDepth < maxDepth) { // t1 = comment
        // Process comment for privacy compliance
        const privacyData = this.privacyService.processCommentForPrivacy({
          author: child.data.author || '[deleted]',
          content: child.data.body || ''
        })

        const comment: RedditComment = {
          redditId: child.data.id,
          postId: postId,
          parentId: child.data.parent_id?.replace(/^t[13]_/, '') || null, // Handle both t1_ and t3_ prefixes
          content: privacyData.sanitizedContent,
          author: child.data.author || '[deleted]',
          anonymizedAuthor: privacyData.anonymizedAuthor,
          score: child.data.score || 0,
          createdUtc: new Date(child.data.created_utc * 1000),
          analysisMetadata: {}, // Will be populated by AI analysis
          processingStatus: 'pending',
          rawData: child.data
        }
        comments.push(comment)
        
        // Recursively handle nested replies within depth limit
        if (child.data.replies && child.data.replies.data?.children && currentDepth < maxDepth - 1) {
          const nestedDepth = this.extractCommentsWithDepth(
            child.data.replies.data.children, 
            comments, 
            postId, 
            currentDepth + 1, 
            maxDepth
          )
          maxLevelReached = Math.max(maxLevelReached, nestedDepth)
        }
      }
    }

    return maxLevelReached
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use extractCommentsWithDepth instead
   */
  private extractComments(children: any[], comments: RedditComment[], postId: string): void {
    this.extractCommentsWithDepth(children, comments, postId, 0, 3)
  }

  /**
   * Transform Reddit API post data to our schema
   */
  private transformRedditPost(data: any, subreddit: string): ProcessedRedditPost {
    return {
      analysisId: this.analysisId || '',
      redditId: data.id,
      subreddit: subreddit,
      title: data.title || '',
      content: data.selftext || null,
      author: data.author || '[deleted]',
      score: data.score || 0,
      numComments: data.num_comments || 0,
      createdUtc: new Date(data.created_utc * 1000),
      url: data.url || '',
      permalink: `https://reddit.com${data.permalink}`,
      rawData: data,
      matchedKeywords: [],
      processed: false
    }
  }


  /**
   * Filter posts by keywords
   */
  filterPostsByKeywords(
    posts: ProcessedRedditPost[],
    keywords: { predefined: string[], custom: string[] }
  ): ProcessedRedditPost[] {
    const allKeywords = [...keywords.predefined, ...keywords.custom]
      .map(k => k.toLowerCase())
    
    if (allKeywords.length === 0) {
      return posts
    }
    
    return posts.filter(post => {
      const textToSearch = `${post.title} ${post.content || ''}`.toLowerCase()
      const matchedKeywords: string[] = []
      
      for (const keyword of allKeywords) {
        if (textToSearch.includes(keyword)) {
          matchedKeywords.push(keyword)
        }
      }
      
      if (matchedKeywords.length > 0) {
        post.matchedKeywords = matchedKeywords
        return true
      }
      
      return false
    })
  }

  /**
   * Collect posts from multiple subreddits with full pagination
   */
  async collectPostsFromSubreddits(
    subreddits: string[],
    timeRange: number,
    keywords: { predefined: string[], custom: string[] },
    maxPostsPerSubreddit: number = 2000 // Increased default limit
  ): Promise<ProcessedRedditPost[]> {
    const allPosts: ProcessedRedditPost[] = []
    const errors: Array<{ subreddit: string, error: string }> = []
    
    // Calculate cutoff date once
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - timeRange)
    
    for (const subreddit of subreddits) {
      let after: string | null = null
      let collectedCount = 0
      let filteredCount = 0
      let retryCount = 0
      const maxRetries = 3
      let reachedTimeLimit = false
      
      console.log(`📊 Collecting ALL posts from r/${subreddit} for the last ${timeRange} days...`)
      console.log(`🔍 Keywords filter: ${keywords.predefined.length + keywords.custom.length > 0 ? 'YES' : 'NO'} (${keywords.predefined.length} predefined + ${keywords.custom.length} custom)`)
      
      while (!reachedTimeLimit && collectedCount < maxPostsPerSubreddit && retryCount < maxRetries) {
        try {
          const { posts, after: nextAfter } = await this.fetchPosts(
            subreddit,
            timeRange,
            100, // Reddit API max per request
            after
          )
          
          if (posts.length === 0) {
            console.log(`No more posts available from r/${subreddit}`)
            break
          }
          
          // Check each post and filter by time
          let postsInTimeRange = 0
          for (const post of posts) {
            if (post.createdUtc > cutoffDate) {
              postsInTimeRange++
              
              // Apply keyword filter if keywords exist
              const hasKeywords = keywords.predefined.length > 0 || keywords.custom.length > 0
              if (hasKeywords) {
                const [filteredPost] = this.filterPostsByKeywords([post], keywords)
                if (filteredPost) {
                  allPosts.push(filteredPost)
                  filteredCount++
                }
              } else {
                // No keywords = collect ALL posts
                allPosts.push(post)
                filteredCount++
              }
            } else {
              // We've reached posts older than our time range
              reachedTimeLimit = true
              console.log(`⏰ Reached posts older than ${timeRange} days`)
              break
            }
          }
          
          collectedCount += posts.length
          
          console.log(`✅ Processed batch: ${posts.length} posts checked, ${postsInTimeRange} in time range, ${filteredCount} total collected from r/${subreddit}`)
          console.log(`📈 Progress: ${collectedCount}/${maxPostsPerSubreddit} posts processed, pagination token: ${nextAfter ? 'yes' : 'none'}`)
          
          // Check if we should continue
          if (reachedTimeLimit) {
            console.log(`🎯 Completed: Found all posts from last ${timeRange} days`)
            break
          }
          
          // Continue pagination if we have more pages
          after = nextAfter
          if (!after) {
            console.log(`📄 No more pages available for r/${subreddit}`)
            break
          }
          
          // Reset retry count on successful request
          retryCount = 0
          
        } catch (error) {
          retryCount++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`Error collecting posts from r/${subreddit} (attempt ${retryCount}/${maxRetries}):`, error)
          
          if (retryCount >= maxRetries) {
            errors.push({ subreddit, error: errorMessage })
            console.error(`Max retries exceeded for r/${subreddit}, continuing with next subreddit`)
            break
          }
          
          // Wait before retrying (exponential backoff)
          const waitTime = Math.min(1000 * Math.pow(2, retryCount - 1), 10000)
          console.log(`Retrying r/${subreddit} in ${waitTime}ms...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
      
      console.log(`📈 r/${subreddit} complete: ${filteredCount} posts collected from ${collectedCount} checked`)
    }
    
    // Log collection summary
    console.log(`Collection complete: ${allPosts.length} total posts collected`)
    if (errors.length > 0) {
      console.warn(`Errors occurred for ${errors.length} subreddit(s):`, errors)
    }
    
    return allPosts
  }

  /**
   * Enhanced comment collection for high-scoring posts with comprehensive options
   * AC: 1, 6 - Automatic triggering for posts scoring 75+ with configurable options
   */
  async collectCommentsForPosts(
    posts: ProcessedRedditPost[],
    options: {
      scoreThreshold?: number
      sampleRate?: number
      maxDepth?: number
      maxCommentsPerPost?: number
      sort?: 'top' | 'best' | 'new'
    } = {}
  ): Promise<Map<string, {comments: RedditComment[], metadata: {totalCount: number, processedLevels: number}}>> {
    const {
      scoreThreshold = 75, // AC: 1 - Default to 75+ scoring posts  
      sampleRate = 1.0, // Process all high-scoring posts by default
      maxDepth = 3,
      maxCommentsPerPost = 100,
      sort = 'top'
    } = options

    const commentsMap = new Map<string, {comments: RedditComment[], metadata: {totalCount: number, processedLevels: number}}>()
    
    // Filter and sort posts by score
    const highScoringPosts = posts
      .filter(post => post.score >= scoreThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.ceil(posts.length * sampleRate))
    
    AppLogger.info('Starting enhanced comment collection', {
      service: 'reddit-client',
      operation: 'collect_comments_for_posts',
      metadata: {
        totalPosts: posts.length,
        highScoringPosts: highScoringPosts.length,
        scoreThreshold,
        maxDepth,
        maxCommentsPerPost
      }
    })
    
    for (const post of highScoringPosts) {
      try {
        // Use enhanced getPostComments with depth limiting
        const result = await this.getPostComments(post.redditId, {
          subreddit: post.subreddit, // Pass subreddit from post data
          depth: maxDepth,
          limit: maxCommentsPerPost,
          sort
        })
        
        if (result.comments.length > 0) {
          commentsMap.set(post.redditId, {
            comments: result.comments,
            metadata: {
              totalCount: result.totalCount,
              processedLevels: result.processedLevels
            }
          })
          
          AppLogger.info('Comments collected for post', {
            service: 'reddit-client',
            operation: 'collect_comments_single_post',
            metadata: {
              postId: post.redditId,
              commentCount: result.totalCount,
              processedLevels: result.processedLevels,
              postScore: post.score
            }
          })
        }
      } catch (error) {
        AppLogger.error('Failed to collect comments for post', {
          service: 'reddit-client',
          operation: 'collect_comments_error',
          metadata: {
            postId: post.redditId,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        })
      }
    }
    
    AppLogger.info('Comment collection completed', {
      service: 'reddit-client',
      operation: 'collect_comments_completed',
      metadata: {
        postsWithComments: commentsMap.size,
        totalComments: Array.from(commentsMap.values()).reduce((sum, data) => sum + data.comments.length, 0)
      }
    })
    
    return commentsMap
  }

  /**
   * Legacy method for backward compatibility  
   * @deprecated Use collectCommentsForPosts with new options interface
   */
  async collectCommentsForPostsLegacy(
    posts: ProcessedRedditPost[],
    sampleRate: number = 0.5,
    scoreThreshold: number = 10
  ): Promise<Map<string, RedditComment[]>> {
    const result = await this.collectCommentsForPosts(posts, {
      scoreThreshold,
      sampleRate
    })
    
    // Convert to legacy format
    const legacyMap = new Map<string, RedditComment[]>()
    for (const [postId, data] of result.entries()) {
      legacyMap.set(postId, data.comments)
    }
    
    return legacyMap
  }
}