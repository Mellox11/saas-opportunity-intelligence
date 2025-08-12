import { Job } from 'bull'
import { prisma } from '@/lib/db'
import { 
  analysisQueue, 
  redditCollectionQueue, 
  aiProcessingQueue, 
  reportGenerationQueue 
} from '@/lib/queues/queue-config'
import { CostTrackingService } from '@/lib/services/cost-tracking.service'

export type AnalysisStage = 
  | 'initializing' 
  | 'reddit_collection' 
  | 'ai_processing' 
  | 'report_generation' 
  | 'completed' 
  | 'failed'

export interface AnalysisProgress {
  stage: AnalysisStage
  message: string
  percentage: number
  totalPosts?: number
  processedPosts?: number
  opportunitiesFound?: number
  estimatedCompletion?: Date
  error?: string
}

export interface AnalysisJobData {
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
  }
}

export class AnalysisOrchestrationService {
  private costTrackingService: CostTrackingService

  constructor() {
    this.costTrackingService = new CostTrackingService()
  }

  /**
   * Start a new analysis pipeline
   */
  async startAnalysis(data: AnalysisJobData): Promise<string> {
    try {
      // Update analysis status to processing
      await this.updateAnalysisStatus(data.analysisId, 'processing')
      await this.updateProgress(data.analysisId, {
        stage: 'initializing',
        message: 'Starting analysis pipeline...',
        percentage: 0
      })

      // Add job to analysis queue
      const job = await analysisQueue.add('process-analysis', data, {
        priority: 1, // High priority
        delay: 0,
        jobId: data.analysisId // Use analysisId as job ID for tracking
      })

      return job.id as string
    } catch (error) {
      await this.handleAnalysisError(data.analysisId, error as Error, 'initializing')
      throw error
    }
  }

  /**
   * Process the complete analysis pipeline
   */
  async processAnalysis(job: Job<AnalysisJobData>): Promise<void> {
    const { analysisId, configuration } = job.data
    
    try {
      // Check cost constraints before starting
      await this.checkCostConstraints(analysisId, configuration.maxCost)

      // Stage 1: Reddit Data Collection (0-50%)
      await this.runRedditCollection(job)
      
      // Stage 2: AI Processing (50-90%)
      await this.runAIProcessing(job)
      
      // Stage 3: Report Generation (90-100%)
      await this.runReportGeneration(job)
      
      // Complete analysis
      await this.completeAnalysis(analysisId)
      
    } catch (error) {
      await this.handleAnalysisError(analysisId, error as Error, 'failed')
      throw error
    }
  }

  /**
   * Run Reddit data collection stage
   */
  private async runRedditCollection(job: Job<AnalysisJobData>): Promise<void> {
    const { analysisId, configuration } = job.data
    
    await this.updateProgress(analysisId, {
      stage: 'reddit_collection',
      message: 'Collecting Reddit posts...',
      percentage: 5
    })

    // Add Reddit collection job
    const redditJob = await redditCollectionQueue.add('collect-posts', {
      analysisId,
      subreddits: configuration.subreddits,
      timeRange: configuration.timeRange,
      keywords: configuration.keywords
    }, {
      priority: 2,
      attempts: 3
    })

    // Wait for Reddit collection to complete
    await redditJob.finished()
    
    // Get collected posts count
    const postsCount = await prisma.redditPost.count({
      where: { analysisId }
    })

    await this.updateProgress(analysisId, {
      stage: 'reddit_collection',
      message: `Collected ${postsCount} posts`,
      percentage: 50,
      totalPosts: postsCount
    })
  }

  /**
   * Run AI processing stage
   */
  private async runAIProcessing(job: Job<AnalysisJobData>): Promise<void> {
    const { analysisId } = job.data
    
    await this.updateProgress(analysisId, {
      stage: 'ai_processing',
      message: 'Analyzing posts for opportunities...',
      percentage: 60
    })

    // Get unprocessed posts
    const posts = await prisma.redditPost.findMany({
      where: {
        analysisId,
        processed: false
      },
      include: {
        comments: true
      }
    })

    // Add AI processing job
    const aiJob = await aiProcessingQueue.add('process-posts', {
      analysisId,
      posts: posts.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content,
        subreddit: post.subreddit,
        score: post.score,
        numComments: post.numComments,
        comments: post.comments.map(c => ({
          content: c.content,
          score: c.score
        }))
      })),
      batchSize: 10
    }, {
      priority: 2,
      attempts: 2
    })

    // Wait for AI processing to complete
    await aiJob.finished()

    // Get opportunities found
    const opportunitiesCount = await prisma.opportunity.count({
      where: { analysisId }
    })

    await this.updateProgress(analysisId, {
      stage: 'ai_processing',
      message: `Found ${opportunitiesCount} opportunities`,
      percentage: 90,
      processedPosts: posts.length,
      opportunitiesFound: opportunitiesCount
    })
  }

  /**
   * Run report generation stage
   */
  private async runReportGeneration(job: Job<AnalysisJobData>): Promise<void> {
    const { analysisId } = job.data
    
    await this.updateProgress(analysisId, {
      stage: 'report_generation',
      message: 'Generating analysis report...',
      percentage: 95
    })

    // Add report generation job
    const reportJob = await reportGenerationQueue.add('generate-report', {
      analysisId
    }, {
      priority: 3,
      attempts: 2
    })

    // Wait for report generation to complete
    await reportJob.finished()
  }

  /**
   * Complete analysis successfully
   */
  private async completeAnalysis(analysisId: string): Promise<void> {
    const completedAt = new Date()
    
    // Get final statistics
    const [postsCount, opportunitiesCount, totalCost] = await Promise.all([
      prisma.redditPost.count({ where: { analysisId } }),
      prisma.opportunity.count({ where: { analysisId } }),
      this.costTrackingService.getTotalAnalysisCost(analysisId)
    ])

    // Update analysis status
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'completed',
        completedAt,
        progress: JSON.stringify({
          stage: 'completed',
          message: `Analysis complete: ${opportunitiesCount} opportunities found from ${postsCount} posts`,
          percentage: 100,
          totalPosts: postsCount,
          processedPosts: postsCount,
          opportunitiesFound: opportunitiesCount
        } as AnalysisProgress),
        metadata: {
          ...((await prisma.analysis.findUnique({ 
            where: { id: analysisId }, 
            select: { metadata: true } 
          }))?.metadata || {}),
          completionStats: {
            totalPosts: postsCount,
            opportunitiesFound: opportunitiesCount,
            totalCost: totalCost.total,
            processingTimeMinutes: Math.round(
              (completedAt.getTime() - (await prisma.analysis.findUnique({ 
                where: { id: analysisId }, 
                select: { createdAt: true } 
              }))!.createdAt.getTime()) / 60000
            )
          }
        }
      }
    })
  }

  /**
   * Handle analysis errors
   */
  private async handleAnalysisError(
    analysisId: string, 
    error: Error, 
    stage: AnalysisStage
  ): Promise<void> {
    console.error(`Analysis ${analysisId} failed at stage ${stage}:`, error)
    
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'failed',
        progress: JSON.stringify({
          stage: 'failed',
          message: `Analysis failed: ${error.message}`,
          percentage: 0,
          error: error.message
        } as AnalysisProgress)
      }
    })
  }

  /**
   * Update analysis progress
   */
  private async updateProgress(analysisId: string, progress: AnalysisProgress): Promise<void> {
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
   * Check cost constraints using circuit breaker
   */
  private async checkCostConstraints(analysisId: string, maxCost: number): Promise<void> {
    const currentCost = await this.costTrackingService.getTotalAnalysisCost(analysisId)
    
    if (currentCost.total >= maxCost) {
      throw new Error(`Cost limit exceeded: $${currentCost.total} >= $${maxCost}`)
    }
  }

  /**
   * Get analysis progress
   */
  async getAnalysisProgress(analysisId: string): Promise<AnalysisProgress | null> {
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      select: { progress: true, status: true }
    })

    if (!analysis || !analysis.progress) {
      return null
    }

    try {
      return JSON.parse(analysis.progress as string) as AnalysisProgress
    } catch (error) {
      console.error('Failed to parse analysis progress:', error)
      return null
    }
  }

  /**
   * Cancel an analysis
   */
  async cancelAnalysis(analysisId: string): Promise<void> {
    try {
      // Update analysis status
      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'cancelled',
          progress: JSON.stringify({
            stage: 'failed',
            message: 'Analysis was cancelled by user',
            percentage: 0
          } as AnalysisProgress)
        }
      })

      // Remove any pending jobs
      const job = await analysisQueue.getJob(analysisId)
      if (job) {
        await job.remove()
      }
    } catch (error) {
      console.error(`Failed to cancel analysis ${analysisId}:`, error)
      throw error
    }
  }
}