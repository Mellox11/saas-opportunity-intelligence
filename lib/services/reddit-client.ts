import { RedditListing, ProcessedRedditPost, RedditComment } from '@/lib/validation/reddit-schema'
import { CostTrackingService } from '@/lib/services/cost-tracking.service'
import { calculateEventCost } from '@/lib/utils/cost-calculator'

export class RedditClient {
  private readonly baseUrl = 'https://www.reddit.com'
  private readonly userAgent = 'SaaS-Opportunity-Intelligence/1.0'
  private readonly rateLimit = {
    requestsPerMinute: 60,
    lastRequestTime: 0,
    requestCount: 0
  }
  private costTrackingService: CostTrackingService | null

  constructor(private analysisId?: string, skipCostTracking: boolean = false) {
    this.costTrackingService = skipCostTracking ? null : new CostTrackingService()
  }

  /**
   * Rate limiting to respect Reddit API limits
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.rateLimit.lastRequestTime
    
    // Reset counter every minute
    if (timeSinceLastRequest > 60000) {
      this.rateLimit.requestCount = 0
      this.rateLimit.lastRequestTime = now
    }
    
    // If we've hit the rate limit, wait
    if (this.rateLimit.requestCount >= this.rateLimit.requestsPerMinute) {
      const waitTime = 60000 - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
      this.rateLimit.requestCount = 0
      this.rateLimit.lastRequestTime = Date.now()
    }
    
    this.rateLimit.requestCount++
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
   * Fetch posts from a subreddit
   */
  async fetchPosts(
    subreddit: string,
    timeRange: number,
    limit: number = 100,
    after?: string | null
  ): Promise<{ posts: ProcessedRedditPost[], after: string | null }> {
    await this.enforceRateLimit()
    
    const timeFilter = this.getTimeFilter(timeRange)
    const url = `${this.baseUrl}/r/${subreddit}/${timeFilter}.json?limit=${limit}${after ? `&after=${after}` : ''}`
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent
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
      
      return {
        posts,
        after: data.data.after
      }
    } catch (error) {
      console.error(`Error fetching posts from r/${subreddit}:`, error)
      throw error
    }
  }

  /**
   * Fetch comments for a post
   */
  async fetchComments(
    subreddit: string,
    postId: string,
    limit: number = 50
  ): Promise<RedditComment[]> {
    await this.enforceRateLimit()
    
    const url = `${this.baseUrl}/r/${subreddit}/comments/${postId}.json?limit=${limit}`
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent
        }
      })
      
      await this.trackRedditCost()
      
      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Reddit returns array with [post, comments]
      if (!Array.isArray(data) || data.length < 2) {
        return []
      }
      
      const commentsListing = data[1]
      const comments: RedditComment[] = []
      
      this.extractComments(commentsListing.data.children, comments, postId)
      
      return comments
    } catch (error) {
      console.error(`Error fetching comments for post ${postId}:`, error)
      return [] // Return empty array on error to allow partial results
    }
  }

  /**
   * Recursively extract comments from Reddit's nested structure
   */
  private extractComments(children: any[], comments: RedditComment[], postId: string): void {
    for (const child of children) {
      if (child.kind === 't1') { // t1 = comment
        const comment: RedditComment = {
          redditId: child.data.id,
          postId: postId,
          parentId: child.data.parent_id?.replace('t1_', '') || null,
          content: child.data.body || '',
          author: child.data.author || '[deleted]',
          score: child.data.score || 0,
          createdUtc: new Date(child.data.created_utc * 1000),
          rawData: child.data
        }
        comments.push(comment)
        
        // Handle nested replies
        if (child.data.replies && child.data.replies.data?.children) {
          this.extractComments(child.data.replies.data.children, comments, postId)
        }
      }
    }
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
   * Get time filter for Reddit API based on days
   */
  private getTimeFilter(days: number): string {
    if (days <= 30) return 'month'
    if (days <= 60) return 'year'
    return 'all'
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
   * Collect posts from multiple subreddits with pagination and enhanced error handling
   */
  async collectPostsFromSubreddits(
    subreddits: string[],
    timeRange: number,
    keywords: { predefined: string[], custom: string[] },
    maxPostsPerSubreddit: number = 500
  ): Promise<ProcessedRedditPost[]> {
    const allPosts: ProcessedRedditPost[] = []
    const errors: Array<{ subreddit: string, error: string }> = []
    
    for (const subreddit of subreddits) {
      let after: string | null = null
      let collectedCount = 0
      let retryCount = 0
      const maxRetries = 3
      
      console.log(`Collecting posts from r/${subreddit}...`)
      
      while (collectedCount < maxPostsPerSubreddit && retryCount < maxRetries) {
        try {
          const { posts, after: nextAfter } = await this.fetchPosts(
            subreddit,
            timeRange,
            100,
            after
          )
          
          if (posts.length === 0) break
          
          // Filter posts by time range
          const cutoffDate = new Date()
          cutoffDate.setDate(cutoffDate.getDate() - timeRange)
          const recentPosts = posts.filter(post => post.createdUtc > cutoffDate)
          
          // Filter by keywords
          const filteredPosts = this.filterPostsByKeywords(recentPosts, keywords)
          
          allPosts.push(...filteredPosts)
          collectedCount += posts.length
          
          console.log(`Collected ${filteredPosts.length} matching posts (${collectedCount} total checked)`)
          
          // Check if we've gone past our time range
          if (recentPosts.length < posts.length) {
            console.log(`Reached posts older than ${timeRange} days, stopping collection`)
            break
          }
          
          after = nextAfter
          if (!after) break
          
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
    }
    
    // Log collection summary
    console.log(`Collection complete: ${allPosts.length} total posts collected`)
    if (errors.length > 0) {
      console.warn(`Errors occurred for ${errors.length} subreddit(s):`, errors)
    }
    
    return allPosts
  }

  /**
   * Collect sample comments for high-scoring posts
   */
  async collectCommentsForPosts(
    posts: ProcessedRedditPost[],
    sampleRate: number = 0.5,
    scoreThreshold: number = 10
  ): Promise<Map<string, RedditComment[]>> {
    const commentsMap = new Map<string, RedditComment[]>()
    
    // Sort posts by score and sample top posts
    const highScoringPosts = posts
      .filter(post => post.score >= scoreThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.ceil(posts.length * sampleRate))
    
    console.log(`Collecting comments for ${highScoringPosts.length} high-scoring posts...`)
    
    for (const post of highScoringPosts) {
      try {
        const comments = await this.fetchComments(
          post.subreddit,
          post.redditId,
          50
        )
        
        if (comments.length > 0) {
          commentsMap.set(post.redditId, comments)
          console.log(`Collected ${comments.length} comments for post ${post.redditId}`)
        }
      } catch (error) {
        console.error(`Failed to collect comments for post ${post.redditId}:`, error)
      }
    }
    
    return commentsMap
  }
}