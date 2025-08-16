import { RedditRSSClient } from '@/lib/services/reddit-rss-client'
import { RedditClient } from '@/lib/services/reddit-client'
import { ProcessedRedditPost, RedditComment } from '@/lib/validation/reddit-schema'
import { AppLogger } from '@/lib/observability/logger'

/**
 * Hybrid Reddit Client that combines RSS feed data collection with JSON API comment collection
 * Uses RSS feeds for reliable post fetching and JSON API for comments when possible
 */
export class HybridRedditClient {
  private rssClient: RedditRSSClient
  private jsonClient: RedditClient
  private logger = AppLogger

  constructor(private analysisId?: string) {
    this.rssClient = new RedditRSSClient(analysisId)
    this.jsonClient = new RedditClient(analysisId, true) // Skip cost tracking to avoid duplicates
  }

  /**
   * Collect posts from multiple subreddits - try JSON API first, fallback to RSS
   */
  async collectPostsFromSubreddits(
    subreddits: string[],
    timeRange: number,
    keywords: { predefined: string[], custom: string[] },
    maxPostsPerSubreddit: number = 2000 // Increased default limit
  ): Promise<ProcessedRedditPost[]> {
    const allPosts: ProcessedRedditPost[] = []
    const errors: Array<{ subreddit: string, error: string }> = []

    this.logger.info('Starting hybrid post collection', {
      service: 'hybrid-reddit-client',
      operation: 'collect_posts',
      metadata: {
        subreddits,
        timeRange,
        maxPostsPerSubreddit,
        keywordCount: keywords.predefined.length + keywords.custom.length
      }
    })

    for (const subreddit of subreddits) {
      let collectedPosts: ProcessedRedditPost[] = []
      
      // Try JSON API first for complete data
      try {
        console.log(`🌐 Attempting to collect posts from r/${subreddit} via JSON API...`)
        
        collectedPosts = await this.jsonClient.collectPostsFromSubreddits(
          [subreddit],
          timeRange,
          keywords,
          maxPostsPerSubreddit
        )
        
        if (collectedPosts.length > 0) {
          console.log(`✅ JSON API successful: collected ${collectedPosts.length} posts from r/${subreddit}`)
        } else {
          console.log(`⚠️ JSON API returned no posts for r/${subreddit}, trying RSS fallback...`)
          throw new Error('No posts from JSON API')
        }
        
      } catch (jsonError) {
        // Fallback to RSS if JSON API fails
        console.log(`⚠️ JSON API failed for r/${subreddit}: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`)
        console.log(`📡 Falling back to RSS feed for r/${subreddit}...`)
        
        try {
          // Try multiple RSS requests to get more data
          const rssPostsSet = new Set<string>() // Track unique posts by ID
          const rssPosts: ProcessedRedditPost[] = []
          
          // Fetch initial batch
          const result = await this.rssClient.fetchPostsViaRSS(subreddit, 100)
          
          if (result.posts.length === 0) {
            console.warn(`No posts found for r/${subreddit} via RSS`)
            continue
          }
          
          // Filter posts by time range
          const cutoffDate = new Date()
          cutoffDate.setDate(cutoffDate.getDate() - timeRange)
          const recentPosts = result.posts.filter(post => post.createdUtc > cutoffDate)
          
          // Apply keyword filter
          const hasKeywords = keywords.predefined.length > 0 || keywords.custom.length > 0
          const filteredPosts = hasKeywords 
            ? this.rssClient.filterPostsByKeywords(recentPosts, keywords)
            : recentPosts // No keywords = all posts
          
          // Add unique posts
          for (const post of filteredPosts) {
            if (!rssPostsSet.has(post.redditId)) {
              rssPostsSet.add(post.redditId)
              rssPosts.push(post)
            }
          }
          
          collectedPosts = rssPosts
          console.log(`📡 RSS fallback collected ${collectedPosts.length} posts from r/${subreddit}`)
          
        } catch (rssError) {
          const errorMessage = rssError instanceof Error ? rssError.message : 'Unknown error'
          console.error(`❌ Both JSON and RSS failed for r/${subreddit}:`, rssError)
          errors.push({ subreddit, error: `JSON and RSS failed: ${errorMessage}` })
          continue
        }
      }
      
      // Mark posts as belonging to this analysis
      const postsWithAnalysisId = collectedPosts.map(post => ({
        ...post,
        analysisId: this.analysisId || '',
        processed: false
      }))
      
      allPosts.push(...postsWithAnalysisId)
      
      console.log(`✅ Collected ${postsWithAnalysisId.length} posts from r/${subreddit}`)
      
      this.logger.info('Subreddit collection completed', {
        service: 'hybrid-reddit-client',
        operation: 'collect_subreddit_posts',
        metadata: {
          subreddit,
          postsCollected: postsWithAnalysisId.length
        }
      })
      
      // Small delay between subreddits to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Log final collection summary
    console.log(`🎯 Collection complete: ${allPosts.length} total posts collected from ${subreddits.length} subreddits`)
    if (errors.length > 0) {
      console.warn(`⚠️ Errors occurred for ${errors.length} subreddit(s):`, errors)
    }

    this.logger.info('RSS post collection completed', {
      service: 'hybrid-reddit-client',
      operation: 'collect_posts_complete',
      metadata: {
        totalPosts: allPosts.length,
        subredditCount: subreddits.length,
        errorCount: errors.length,
        errors: errors
      }
    })

    return allPosts
  }

  /**
   * Collect comments for high-scoring posts using JSON API (when possible)
   * Falls back gracefully if JSON API is blocked
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

    if (highScoringPosts.length === 0) {
      console.log('No high-scoring posts found for comment collection')
      return commentsMap
    }

    console.log(`💬 Collecting comments for ${highScoringPosts.length} high-scoring posts...`)

    this.logger.info('Starting comment collection', {
      service: 'hybrid-reddit-client',
      operation: 'collect_comments',
      metadata: {
        eligiblePosts: highScoringPosts.length,
        scoreThreshold,
        sampleRate
      }
    })

    for (const post of highScoringPosts) {
      try {
        // Try to collect comments using JSON API
        const comments = await this.jsonClient.fetchComments(
          post.subreddit,
          post.redditId,
          50 // Max comments per post
        )

        if (comments.length > 0) {
          commentsMap.set(post.redditId, comments)
          console.log(`✅ Collected ${comments.length} comments for post ${post.redditId}`)
        } else {
          console.log(`⚪ No comments found for post ${post.redditId}`)
        }

      } catch (error) {
        console.error(`❌ Failed to collect comments for post ${post.redditId}:`, error)
        
        // Don't fail the entire collection if comments fail for one post
        this.logger.warn('Comment collection failed for post', {
          service: 'hybrid-reddit-client',
          operation: 'collect_post_comments',
          metadata: {
            postId: post.redditId,
            subreddit: post.subreddit
          }
        }, error as Error)
      }

      // Small delay between comment requests
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    const totalComments = Array.from(commentsMap.values()).reduce((sum, comments) => sum + comments.length, 0)
    console.log(`💬 Comment collection complete: ${totalComments} comments from ${commentsMap.size} posts`)

    this.logger.info('Comment collection completed', {
      service: 'hybrid-reddit-client',
      operation: 'collect_comments_complete',
      metadata: {
        postsWithComments: commentsMap.size,
        totalComments,
        successRate: (commentsMap.size / highScoringPosts.length) * 100
      }
    })

    return commentsMap
  }

  /**
   * Filter posts by keywords (delegate to RSS client)
   */
  filterPostsByKeywords(
    posts: ProcessedRedditPost[],
    keywords: { predefined: string[], custom: string[] }
  ): ProcessedRedditPost[] {
    return this.rssClient.filterPostsByKeywords(posts, keywords)
  }

  /**
   * Test RSS connectivity for a subreddit
   */
  async testSubredditConnectivity(subreddit: string): Promise<{ accessible: boolean, postCount: number, error?: string }> {
    try {
      const result = await this.rssClient.fetchPostsViaRSS(subreddit, 5)
      return {
        accessible: true,
        postCount: result.posts.length
      }
    } catch (error) {
      return {
        accessible: false,
        postCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get real-time post count estimate for a subreddit
   */
  async getRealtimePostEstimate(
    subreddit: string, 
    timeRange: number, 
    keywords: { predefined: string[], custom: string[] }
  ): Promise<{ estimatedPosts: number, sampleSize: number }> {
    try {
      // Fetch a small sample to estimate activity
      const result = await this.rssClient.fetchPostsViaRSS(subreddit, 25)
      
      if (result.posts.length === 0) {
        return { estimatedPosts: 0, sampleSize: 0 }
      }

      // Filter by time range
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - timeRange)
      const recentPosts = result.posts.filter(post => post.createdUtc > cutoffDate)

      // Filter by keywords
      const filteredPosts = this.rssClient.filterPostsByKeywords(recentPosts, keywords)

      // Estimate total based on sample
      const sampleTimeRange = Math.min(timeRange, 7) // Use recent data for estimation
      const dailyRate = recentPosts.length / sampleTimeRange
      const estimatedTotal = Math.floor(dailyRate * timeRange)
      const filteredRate = filteredPosts.length / Math.max(1, recentPosts.length)
      const estimatedFiltered = Math.floor(estimatedTotal * filteredRate)

      return {
        estimatedPosts: Math.max(1, estimatedFiltered),
        sampleSize: result.posts.length
      }

    } catch (error) {
      console.error(`Error estimating posts for r/${subreddit}:`, error)
      return { estimatedPosts: 0, sampleSize: 0 }
    }
  }
}