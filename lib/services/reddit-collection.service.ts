import { prisma } from '@/lib/db'
import { HybridRedditClient } from '@/lib/services/hybrid-reddit-client'
import { ProcessedRedditPost } from '@/lib/validation/reddit-schema'
import { Prisma } from '@prisma/client'

export class RedditCollectionService {
  private redditClient: HybridRedditClient

  constructor(private analysisId: string) {
    this.redditClient = new HybridRedditClient(analysisId)
  }

  /**
   * Collect and store Reddit posts for an analysis
   */
  async collectAndStorePosts(
    subreddits: string[],
    timeRange: number,
    keywords: { predefined: string[], custom: string[] }
  ): Promise<{ postsCollected: number, commentsCollected: number }> {
    try {
      // Update analysis status to processing
      await prisma.analysis.update({
        where: { id: this.analysisId },
        data: {
          status: 'processing',
          startedAt: new Date(),
          progress: JSON.stringify({
            stage: 'reddit_collection',
            message: 'Collecting Reddit posts...',
            percentage: 10
          })
        }
      })

      // Collect posts from Reddit
      console.log(`🔄 Starting Reddit collection for subreddits: ${subreddits.join(', ')}`)
      console.log(`🔄 Time range: ${timeRange} days, Keywords: ${JSON.stringify(keywords)}`)
      
      const posts = await this.redditClient.collectPostsFromSubreddits(
        subreddits,
        timeRange,
        keywords,
        2000 // Increased limit to fetch all posts in time range
      )

      console.log(`✅ Reddit client returned ${posts.length} posts`)
      console.log(`📊 Posts breakdown:`, posts.slice(0, 3).map(p => ({ title: p.title, subreddit: p.subreddit, score: p.score })))

      // Store posts in database
      console.log(`💾 Storing ${posts.length} posts in database...`)
      await this.storePosts(posts)
      console.log(`✅ Posts successfully stored in database`)

      // Update progress
      await prisma.analysis.update({
        where: { id: this.analysisId },
        data: {
          progress: JSON.stringify({
            stage: 'reddit_collection',
            message: 'Collecting comments for high-scoring posts...',
            percentage: 40
          })
        }
      })

      // Collect comments for high-scoring posts
      const commentsMap = await this.redditClient.collectCommentsForPosts(
        posts,
        0.5, // Sample 50% of posts
        10   // Minimum score threshold
      )

      // Store comments in database
      const commentsCount = await this.storeComments(commentsMap)

      // Update progress
      await prisma.analysis.update({
        where: { id: this.analysisId },
        data: {
          progress: JSON.stringify({
            stage: 'reddit_collection',
            message: `Collected ${posts.length} posts and ${commentsCount} comments`,
            percentage: 50,
            postsCollected: posts.length,
            commentsCollected: commentsCount
          })
        }
      })

      return {
        postsCollected: posts.length,
        commentsCollected: commentsCount
      }

    } catch (error) {
      console.error('Reddit collection error:', error)
      
      // Update analysis with error
      await prisma.analysis.update({
        where: { id: this.analysisId },
        data: {
          status: 'failed',
          errorDetails: JSON.stringify({
            stage: 'reddit_collection',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          })
        }
      })

      throw error
    }
  }

  /**
   * Store Reddit posts in database
   */
  private async storePosts(posts: ProcessedRedditPost[]): Promise<void> {
    // Batch insert posts
    const postData: Prisma.RedditPostCreateManyInput[] = posts.map(post => ({
      analysisId: this.analysisId,
      redditId: post.redditId,
      subreddit: post.subreddit,
      title: post.title,
      content: post.content,
      author: post.author,
      score: post.score,
      numComments: post.numComments,
      createdUtc: post.createdUtc,
      url: post.url,
      permalink: post.permalink,
      rawData: JSON.stringify(post.rawData),
      matchedKeywords: post.matchedKeywords.length > 0 
        ? JSON.stringify(post.matchedKeywords) 
        : null,
      processed: false
    }))

    // Use createMany with skipDuplicates to handle potential duplicates
    await prisma.redditPost.createMany({
      data: postData,
      skipDuplicates: true
    })

    console.log(`Stored ${postData.length} posts in database`)
  }

  /**
   * Store Reddit comments in database
   */
  private async storeComments(commentsMap: Map<string, any[]>): Promise<number> {
    let totalComments = 0

    for (const [redditPostId, comments] of commentsMap) {
      // Find the post in our database
      const post = await prisma.redditPost.findFirst({
        where: {
          redditId: redditPostId,
          analysisId: this.analysisId
        }
      })

      if (!post) {
        console.warn(`Post ${redditPostId} not found in database, skipping comments`)
        continue
      }

      // Prepare comment data
      const commentData: Prisma.RedditCommentCreateManyInput[] = comments.map(comment => ({
        postId: post.id,
        redditId: comment.redditId,
        parentId: comment.parentId,
        content: comment.content,
        author: comment.author,
        score: comment.score,
        createdUtc: comment.createdUtc,
        rawData: JSON.stringify(comment.rawData || {})
      }))

      // Batch insert comments
      await prisma.redditComment.createMany({
        data: commentData,
        skipDuplicates: true
      })

      totalComments += commentData.length
    }

    console.log(`Stored ${totalComments} comments in database`)
    return totalComments
  }

  /**
   * Get collected posts for an analysis
   */
  async getCollectedPosts(limit?: number): Promise<any[]> {
    return await prisma.redditPost.findMany({
      where: {
        analysisId: this.analysisId
      },
      orderBy: {
        score: 'desc'
      },
      take: limit,
      include: {
        comments: {
          orderBy: {
            score: 'desc'
          },
          take: 5 // Top 5 comments per post
        }
      }
    })
  }

  /**
   * Mark posts as processed after AI analysis
   */
  async markPostsAsProcessed(postIds: string[]): Promise<void> {
    await prisma.redditPost.updateMany({
      where: {
        id: {
          in: postIds
        },
        analysisId: this.analysisId
      },
      data: {
        processed: true
      }
    })
  }
}