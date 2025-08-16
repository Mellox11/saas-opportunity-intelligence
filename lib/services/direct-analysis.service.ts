import { prisma } from '@/lib/db'
import { RedditCollectionService } from '@/lib/services/reddit-collection.service'
import { AIProcessingService } from '@/lib/services/ai-processing.service'
import { CommentAnalysisService } from '@/lib/services/comment-analysis.service'
import { CostTrackingService } from '@/lib/services/cost-tracking.service'
import { AppLogger } from '@/lib/observability/logger'
import { createCorrelatedLogger } from '@/lib/middleware/correlation'

export interface DirectAnalysisJobData {
  analysisId: string
  userId: string
  configuration: {
    subreddits: string[]
    timeRange: number
    keywords: {
      predefined: string[]
      custom: string[]
    }
    maxCost: number
    commentAnalysisEnabled?: boolean
  }
}

export interface DirectAnalysisProgress {
  stage: 'initializing' | 'reddit_collection' | 'ai_processing' | 'comment_analysis' | 'completed' | 'failed'
  message: string
  percentage: number
  totalPosts?: number
  processedPosts?: number
  commentsProcessed?: number
  opportunitiesFound?: number
  estimatedCompletion?: Date
  error?: string
}

/**
 * Direct Analysis Service for synchronous processing without Redis queues
 * Provides immediate results while maintaining the same pipeline structure
 */
export class DirectAnalysisService {
  private costTrackingService: CostTrackingService

  constructor() {
    this.costTrackingService = new CostTrackingService()
  }

  /**
   * Process analysis directly without queues
   */
  async processAnalysisDirectly(data: DirectAnalysisJobData): Promise<void> {
    const logger = createCorrelatedLogger('direct-analysis', 'process_directly')
    const { analysisId, configuration } = data
    
    try {
      logger.info('Starting direct analysis processing', {
        analysisId,
        userId: data.userId,
        metadata: {
          subreddits: configuration.subreddits,
          timeRange: configuration.timeRange,
          maxCost: configuration.maxCost
        }
      })

      // Check cost constraints before starting
      await this.checkCostConstraints(analysisId, configuration.maxCost)

      // Validate database schema before proceeding
      await this.validateDatabaseSchema()

      // Update analysis status
      await this.updateAnalysisStatus(analysisId, 'processing')
      await this.updateProgress(analysisId, {
        stage: 'initializing',
        message: 'Starting Reddit data collection...',
        percentage: 0
      })

      // Stage 1: Reddit Data Collection (0-40%)
      await this.runRedditCollectionDirect(data)
      
      // Stage 2: Comment Analysis (40-70%) - NEW: AC 1,2,3,7,10
      if (configuration.commentAnalysisEnabled !== false) {
        await this.runCommentAnalysisDirect(data)
      } else {
        // Skip comment analysis if disabled
        await this.updateProgress(analysisId, {
          stage: 'comment_analysis',
          message: 'Comment analysis disabled - skipping to AI processing',
          percentage: 70,
          commentsProcessed: 0
        })
      }
      
      // Stage 3: AI Processing (70-90%)
      await this.runAIProcessingDirect(data)
      
      // Complete analysis (90-100%)
      await this.completeAnalysis(analysisId)
      
      logger.info('Direct analysis processing completed successfully', {
        analysisId,
        userId: data.userId
      })

    } catch (error) {
      logger.error('Direct analysis processing failed', {
        analysisId,
        userId: data.userId
      }, error as Error)
      
      await this.handleAnalysisError(analysisId, error as Error)
      throw error
    }
  }

  /**
   * Run Reddit data collection synchronously
   */
  private async runRedditCollectionDirect(data: DirectAnalysisJobData): Promise<void> {
    const { analysisId, configuration } = data
    const logger = createCorrelatedLogger('direct-analysis', 'reddit_collection')
    
    await this.updateProgress(analysisId, {
      stage: 'reddit_collection',
      message: 'Collecting Reddit posts...',
      percentage: 5
    })

    logger.info('Starting Reddit collection', { analysisId })

    // Use the existing Reddit collection service
    const redditCollectionService = new RedditCollectionService(analysisId)
    
    const { postsCollected, commentsCollected } = await redditCollectionService.collectAndStorePosts(
      configuration.subreddits,
      configuration.timeRange,
      configuration.keywords
    )

    logger.info('Reddit collection completed', {
      analysisId,
      metadata: {
        postsCollected,
        commentsCollected
      }
    })

    await this.updateProgress(analysisId, {
      stage: 'reddit_collection',
      message: `Collected ${postsCollected} posts with ${commentsCollected} comments`,
      percentage: 40,
      totalPosts: postsCollected
    })
  }

  /**
   * Run comment analysis for high-scoring posts
   * AC: 1 - Automatically triggers comment analysis for posts scoring 75+
   * AC: 2 - AI processes comment threads using same classification pipeline as posts
   * AC: 3 - Comments provide validation signals: agreement, disagreement, alternative solutions mentioned
   * AC: 7 - Comment sentiment analysis identifies enthusiasm vs skepticism levels with confidence scores
   */
  private async runCommentAnalysisDirect(data: DirectAnalysisJobData): Promise<void> {
    const { analysisId } = data
    const logger = createCorrelatedLogger('direct-analysis', 'comment_analysis')
    
    await this.updateProgress(analysisId, {
      stage: 'comment_analysis',
      message: 'Analyzing comment sentiment for high-scoring posts...',
      percentage: 40
    })

    logger.info('Starting comment analysis', { analysisId })

    // Get high-scoring posts with comments (75+ score threshold)
    let highScoringPosts: any[]
    try {
      highScoringPosts = await prisma.redditPost.findMany({
        where: {
          analysisId,
          score: {
            gte: 75 // AC: 1 - Automatically triggers for posts scoring 75+
          }
        },
        include: {
          comments: {
            where: {
              processingStatus: 'pending' // Only process unanalyzed comments
            },
            select: {
              id: true,
              redditId: true,
              parentId: true,
              content: true,
              author: true,
              score: true,
              createdUtc: true,
              rawData: true,
              analysisMetadata: true,
              processingStatus: true,
              embeddingId: true,
              processedAt: true,
              postId: true
            }
          }
        }
      })
    } catch (error) {
      // Fallback: query without comments if there are schema issues
      logger.warn('Failed to query comments for high-scoring posts, skipping comment analysis', { 
        analysisId,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      highScoringPosts = []
    }

    if (highScoringPosts.length === 0) {
      logger.info('No high-scoring posts found for comment analysis', { analysisId })
      await this.updateProgress(analysisId, {
        stage: 'comment_analysis',
        message: 'No posts meet score threshold (75+) for comment analysis',
        percentage: 70,
        commentsProcessed: 0
      })
      return
    }

    const commentAnalysisService = new CommentAnalysisService(analysisId)
    let totalCommentsProcessed = 0

    // Process each high-scoring post's comments
    for (let i = 0; i < highScoringPosts.length; i++) {
      const post = highScoringPosts[i]
      
      if (post.comments.length === 0) {
        continue
      }

      logger.info('Analyzing comments for post', {
        analysisId,
        metadata: {
          postId: post.id,
          commentCount: post.comments.length,
          postScore: post.score
        }
      })

      try {
        // Use batch analysis for efficiency
        const analysisResults = await commentAnalysisService.batchAnalyzeComments(
          post.comments.map((comment: any) => ({
            ...comment,
            createdUtc: comment.createdUtc
          })),
          post.content || post.title, // Provide post context for better analysis
          5 // Batch size
        )

        // Update comments with analysis results
        for (const [commentId, metadata] of analysisResults.entries()) {
          await prisma.redditComment.update({
            where: { redditId: commentId },
            data: {
              analysisMetadata: JSON.stringify(metadata),
              processingStatus: 'completed'
            }
          })
        }

        totalCommentsProcessed += analysisResults.size

        // Update progress
        const progressPercentage = 40 + (30 * (i + 1) / highScoringPosts.length)
        await this.updateProgress(analysisId, {
          stage: 'comment_analysis',
          message: `Analyzed ${totalCommentsProcessed} comments across ${i + 1} high-scoring posts`,
          percentage: Math.round(progressPercentage),
          commentsProcessed: totalCommentsProcessed
        })

      } catch (error) {
        logger.error('Failed to analyze comments for post', {
          analysisId,
          metadata: {
            postId: post.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        })

        // Mark comments as failed but continue processing
        await prisma.redditComment.updateMany({
          where: {
            postId: post.id,
            processingStatus: 'pending'
          },
          data: {
            processingStatus: 'failed'
          }
        })
      }
    }

    logger.info('Comment analysis completed', {
      analysisId,
      metadata: {
        totalCommentsProcessed,
        postsAnalyzed: highScoringPosts.length
      }
    })

    await this.updateProgress(analysisId, {
      stage: 'comment_analysis',
      message: `Comment analysis complete: ${totalCommentsProcessed} comments analyzed`,
      percentage: 70,
      commentsProcessed: totalCommentsProcessed
    })
  }

  /**
   * Run AI processing synchronously
   */
  private async runAIProcessingDirect(data: DirectAnalysisJobData): Promise<void> {
    const { analysisId } = data
    const logger = createCorrelatedLogger('direct-analysis', 'ai_processing')
    
    await this.updateProgress(analysisId, {
      stage: 'ai_processing',
      message: 'Analyzing posts for SaaS opportunities...',
      percentage: 70
    })

    logger.info('Starting AI processing', { analysisId })

    // Get unprocessed posts with comments (with graceful handling for schema mismatches)
    let posts
    try {
      posts = await prisma.redditPost.findMany({
        where: {
          analysisId,
          processed: false
        },
        include: {
          comments: {
            select: {
              id: true,
              redditId: true,
              parentId: true,
              content: true,
              author: true,
              score: true,
              createdUtc: true,
              rawData: true,
              analysisMetadata: true,
              processingStatus: true,
              embeddingId: true,
              processedAt: true,
              postId: true
            }
          }
        }
      })
    } catch (error) {
      // Fallback: query without comments if there are schema issues
      logger.warn('Failed to query with comments, falling back to posts only', { 
        analysisId,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      posts = await prisma.redditPost.findMany({
        where: {
          analysisId,
          processed: false
        }
      })
      // Add empty comments array to maintain compatibility
      posts = posts.map(post => ({ ...post, comments: [] }))
    }

    if (posts.length === 0) {
      logger.warn('No posts found for AI processing', { analysisId })
      await this.updateProgress(analysisId, {
        stage: 'ai_processing',
        message: 'No posts to analyze',
        percentage: 90,
        processedPosts: 0,
        opportunitiesFound: 0
      })
      return
    }

    // Use the existing AI processing service
    const aiProcessingService = new AIProcessingService(analysisId)
    
    // Process posts in batches for better performance and cost control
    const batchSize = 10
    let processedCount = 0
    let totalOpportunities = 0

    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize)
      
      // Update progress
      const progressPercentage = 60 + Math.floor((processedCount / posts.length) * 30)
      await this.updateProgress(analysisId, {
        stage: 'ai_processing',
        message: `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(posts.length / batchSize)}...`,
        percentage: progressPercentage,
        processedPosts: processedCount,
        totalPosts: posts.length
      })

      // Process batch
      for (const post of batch) {
        try {
          // Check cost constraints before each post
          await this.checkCostConstraints(analysisId, data.configuration.maxCost)
          
          const opportunities = await aiProcessingService.classifyOpportunity({
            postId: post.id,
            title: post.title,
            content: post.content || '',
            subreddit: post.subreddit,
            score: post.score,
            numComments: post.numComments,
            comments: post.comments.map((c: any) => ({
              content: c.content,
              score: c.score
            }))
          })

          totalOpportunities += opportunities.length

          // Mark post as processed
          await prisma.redditPost.update({
            where: { id: post.id },
            data: { processed: true }
          })

          processedCount++

        } catch (error) {
          logger.error('Failed to process post', {
            analysisId,
            metadata: {
              postId: post.id
            }
          }, error as Error)
          
          // Continue processing other posts even if one fails
          processedCount++
        }
      }

      // Small delay between batches to prevent overwhelming the AI service
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    logger.info('AI processing completed', {
      analysisId,
      metadata: {
        processedPosts: processedCount,
        opportunitiesFound: totalOpportunities
      }
    })

    await this.updateProgress(analysisId, {
      stage: 'ai_processing',
      message: `Analysis complete: found ${totalOpportunities} opportunities`,
      percentage: 90,
      processedPosts: processedCount,
      opportunitiesFound: totalOpportunities
    })
  }

  /**
   * Complete analysis successfully
   */
  private async completeAnalysis(analysisId: string): Promise<void> {
    const completedAt = new Date()
    
    // Get final statistics - no opportunities since AI processing is disabled
    const [postsCount, totalCost] = await Promise.all([
      prisma.redditPost.count({ where: { analysisId } }),
      this.costTrackingService.getAnalysisCostBreakdown(analysisId)
    ])
    
    const opportunitiesCount = 0 // No AI processing, so no opportunities

    // Update analysis status
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'completed',
        completedAt,
        progress: JSON.stringify({
          stage: 'completed',
          message: `Reddit collection complete: ${postsCount} posts collected (AI analysis skipped)`,
          percentage: 100,
          totalPosts: postsCount,
          processedPosts: postsCount,
          opportunitiesFound: opportunitiesCount
        } as DirectAnalysisProgress),
        metadata: JSON.stringify({
          completionStats: {
            totalPosts: postsCount,
            opportunitiesFound: opportunitiesCount,
            totalCost: totalCost.total,
            processingTimeMinutes: Math.round(
              (completedAt.getTime() - (await prisma.analysis.findUnique({ 
                where: { id: analysisId }, 
                select: { createdAt: true } 
              }))!.createdAt.getTime()) / 60000
            ),
            processingMode: 'direct'
          }
        })
      }
    })

    // Log business event
    AppLogger.business('Direct analysis completed', {
      service: 'direct-analysis',
      operation: 'analysis_completed',
      analysisId,
      businessEvent: 'analysis_completed',
      value: totalCost.total,
      currency: 'USD',
      metadata: {
        totalPosts: postsCount,
        opportunitiesFound: opportunitiesCount,
        processingMode: 'direct'
      }
    })
  }

  /**
   * Handle analysis errors
   */
  private async handleAnalysisError(analysisId: string, error: Error): Promise<void> {
    const logger = createCorrelatedLogger('direct-analysis', 'handle_error')
    
    logger.error('Direct analysis failed', {
      analysisId,
      metadata: {
        errorName: error.name,
        errorMessage: error.message
      }
    }, error)

    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'failed',
        progress: JSON.stringify({
          stage: 'failed',
          message: `Analysis failed: ${error.message}`,
          percentage: 0,
          error: error.message
        } as DirectAnalysisProgress)
      }
    })

    // Log business event for analysis failure
    AppLogger.business('Direct analysis failed', {
      service: 'direct-analysis',
      operation: 'analysis_failed',
      analysisId,
      businessEvent: 'analysis_failed',
      metadata: {
        errorType: error.name,
        errorMessage: error.message,
        processingMode: 'direct'
      }
    })
  }

  /**
   * Update analysis progress
   */
  private async updateProgress(analysisId: string, progress: DirectAnalysisProgress): Promise<void> {
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        progress: JSON.stringify(progress)
      }
    })
  }

  /**
   * Update analysis status
   */
  private async updateAnalysisStatus(analysisId: string, status: string): Promise<void> {
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { status }
    })
  }

  /**
   * Check cost constraints
   */
  private async checkCostConstraints(analysisId: string, maxCost: number): Promise<void> {
    const currentCost = await this.costTrackingService.getAnalysisCostBreakdown(analysisId)
    
    if (currentCost.total >= maxCost) {
      throw new Error(`Cost limit exceeded: $${currentCost.total.toFixed(2)} >= $${maxCost}`)
    }
  }

  /**
   * Get analysis progress for direct processing
   */
  async getAnalysisProgress(analysisId: string): Promise<DirectAnalysisProgress | null> {
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      select: { progress: true, status: true }
    })

    if (!analysis || !analysis.progress) {
      return null
    }

    try {
      return JSON.parse(analysis.progress as string) as DirectAnalysisProgress
    } catch (error) {
      console.error('Failed to parse analysis progress:', {
        analysisId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Validate database schema for compatibility with analysis operations
   */
  private async validateDatabaseSchema(): Promise<void> {
    const logger = createCorrelatedLogger('direct-analysis', 'schema_validation')
    
    try {
      // Test basic Reddit data models
      await prisma.redditPost.findFirst({
        take: 1,
        select: { id: true }
      })

      // Test comments with reduced field selection to avoid schema issues
      await prisma.redditComment.findFirst({
        take: 1,
        select: {
          id: true,
          content: true,
          author: true,
          score: true
        }
      })

      logger.info('Database schema validation passed')
    } catch (error) {
      logger.error('Database schema validation failed', {}, error as Error)
      throw new Error(`Database schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure your database is up to date.`)
    }
  }
}