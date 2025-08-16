import { AppLogger } from '@/lib/observability/logger'
import { prisma } from '@/lib/db'
import { analysisQueue, redditCollectionQueue, aiProcessingQueue, reportGenerationQueue } from '@/lib/queues/queue-config'

export interface CleanupConfig {
  staleJobAgeMs: number // Age after which jobs are considered stale
  maxFailedJobs: number // Maximum failed jobs to keep
  cleanupIntervalMs: number // How often to run cleanup
  retryAttempts: number // Maximum retry attempts for failed jobs
}

export interface CleanupMetrics {
  totalJobsProcessed: number
  staleJobsRemoved: number
  failedJobsRetried: number
  failedJobsRemoved: number
  orphanedAnalysesHandled: number
  lastCleanupTime: Date
  errors: string[]
}

export class QueueCleanupService {
  private isRunning = false
  private cleanupInterval?: NodeJS.Timeout
  private metrics: CleanupMetrics = {
    totalJobsProcessed: 0,
    staleJobsRemoved: 0,
    failedJobsRetried: 0,
    failedJobsRemoved: 0,
    orphanedAnalysesHandled: 0,
    lastCleanupTime: new Date(),
    errors: []
  }

  constructor(private config: CleanupConfig) {}

  /**
   * Start the cleanup service
   */
  public start(): void {
    if (this.isRunning) {
      AppLogger.warn('Queue cleanup service already running', {
        service: 'queue-cleanup',
        operation: 'start_attempted'
      })
      return
    }

    this.isRunning = true
    this.cleanupInterval = setInterval(() => {
      this.performCleanup().catch(error => {
        AppLogger.error('Queue cleanup failed', {
          service: 'queue-cleanup',
          operation: 'cleanup_error',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        })
      })
    }, this.config.cleanupIntervalMs)

    AppLogger.info('Queue cleanup service started', {
      service: 'queue-cleanup',
      operation: 'service_started',
      metadata: {
        config: this.config
      }
    })
  }

  /**
   * Stop the cleanup service
   */
  public stop(): void {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }

    AppLogger.info('Queue cleanup service stopped', {
      service: 'queue-cleanup',
      operation: 'service_stopped',
      metadata: {
        finalMetrics: this.metrics
      }
    })
  }

  /**
   * Perform manual cleanup
   */
  public async performCleanup(): Promise<CleanupMetrics> {
    const startTime = Date.now()
    const cleanupStartTime = new Date()
    
    try {
      AppLogger.info('Starting queue cleanup', {
        service: 'queue-cleanup',
        operation: 'cleanup_started'
      })

      // Reset error list for this cleanup run
      this.metrics.errors = []

      // Clean up each queue
      await this.cleanupQueue(analysisQueue, 'analysis')
      await this.cleanupQueue(redditCollectionQueue, 'reddit-collection')
      await this.cleanupQueue(aiProcessingQueue, 'ai-processing')
      await this.cleanupQueue(reportGenerationQueue, 'report-generation')

      // Handle orphaned analyses
      await this.handleOrphanedAnalyses()

      // Clean up old analysis records
      await this.cleanupOldAnalyses()

      this.metrics.lastCleanupTime = cleanupStartTime
      const duration = Date.now() - startTime

      AppLogger.business('Queue cleanup completed', {
        service: 'queue-cleanup',
        operation: 'cleanup_completed',
        businessEvent: 'system_maintenance',
        metadata: {
          duration,
          metrics: this.metrics
        }
      })

      return { ...this.metrics }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.metrics.errors.push(errorMessage)
      
      AppLogger.error('Queue cleanup failed', {
        service: 'queue-cleanup',
        operation: 'cleanup_failed',
        metadata: {
          error: errorMessage,
          duration: Date.now() - startTime
        }
      })

      throw error
    }
  }

  /**
   * Clean up a specific queue
   */
  private async cleanupQueue(queue: any, queueName: string): Promise<void> {
    try {
      // Get waiting jobs
      const waiting = await queue.getWaiting()
      const failed = await queue.getFailed()
      const stalled = await queue.getStalled()

      this.metrics.totalJobsProcessed += waiting.length + failed.length + stalled.length

      // Remove stale waiting jobs
      await this.removeStaleJobs(waiting, queueName)

      // Handle failed jobs
      await this.handleFailedJobs(failed, queueName)

      // Remove stalled jobs
      await this.removeStalledJobs(stalled, queueName)

      AppLogger.debug('Queue cleaned', {
        service: 'queue-cleanup',
        operation: 'queue_cleaned',
        metadata: {
          queueName,
          waitingJobs: waiting.length,
          failedJobs: failed.length,
          stalledJobs: stalled.length
        }
      })

    } catch (error) {
      const errorMessage = `Failed to cleanup ${queueName} queue: ${error instanceof Error ? error.message : 'Unknown error'}`
      this.metrics.errors.push(errorMessage)
      
      AppLogger.error('Queue cleanup failed for specific queue', {
        service: 'queue-cleanup',
        operation: 'queue_cleanup_failed',
        metadata: {
          queueName,
          error: errorMessage
        }
      })
    }
  }

  /**
   * Remove stale jobs from waiting state
   */
  private async removeStaleJobs(jobs: any[], queueName: string): Promise<void> {
    const staleThreshold = Date.now() - this.config.staleJobAgeMs
    let removedCount = 0

    for (const job of jobs) {
      try {
        if (job.timestamp < staleThreshold) {
          await job.remove()
          removedCount++
          this.metrics.staleJobsRemoved++

          // Update analysis status if it's an analysis job
          if (job.data?.analysisId) {
            await this.markAnalysisAsFailed(job.data.analysisId, 'Job timed out')
          }
        }
      } catch (error) {
        AppLogger.warn('Failed to remove stale job', {
          service: 'queue-cleanup',
          operation: 'stale_job_removal_failed',
          metadata: {
            queueName,
            jobId: job.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        })
      }
    }

    if (removedCount > 0) {
      AppLogger.info('Stale jobs removed', {
        service: 'queue-cleanup',
        operation: 'stale_jobs_removed',
        metadata: {
          queueName,
          removedCount
        }
      })
    }
  }

  /**
   * Handle failed jobs - retry or remove
   */
  private async handleFailedJobs(jobs: any[], queueName: string): Promise<void> {
    let retriedCount = 0
    let removedCount = 0

    for (const job of jobs) {
      try {
        const attemptsMade = job.attemptsMade || 0
        
        if (attemptsMade < this.config.retryAttempts) {
          // Retry the job
          await job.retry()
          retriedCount++
          this.metrics.failedJobsRetried++
          
          AppLogger.info('Failed job retried', {
            service: 'queue-cleanup',
            operation: 'job_retried',
            metadata: {
              queueName,
              jobId: job.id,
              attempt: attemptsMade + 1
            }
          })
        } else {
          // Remove job after max retries
          await job.remove()
          removedCount++
          this.metrics.failedJobsRemoved++

          // Update analysis status if it's an analysis job
          if (job.data?.analysisId) {
            await this.markAnalysisAsFailed(
              job.data.analysisId, 
              `Job failed after ${attemptsMade} attempts: ${job.failedReason}`
            )
          }

          AppLogger.warn('Failed job removed after max retries', {
            service: 'queue-cleanup',
            operation: 'failed_job_removed',
            metadata: {
              queueName,
              jobId: job.id,
              attempts: attemptsMade,
              reason: job.failedReason
            }
          })
        }
      } catch (error) {
        AppLogger.warn('Failed to handle failed job', {
          service: 'queue-cleanup',
          operation: 'failed_job_handling_error',
          metadata: {
            queueName,
            jobId: job.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        })
      }
    }

    if (retriedCount > 0 || removedCount > 0) {
      AppLogger.info('Failed jobs processed', {
        service: 'queue-cleanup',
        operation: 'failed_jobs_processed',
        metadata: {
          queueName,
          retriedCount,
          removedCount
        }
      })
    }
  }

  /**
   * Remove stalled jobs
   */
  private async removeStalledJobs(jobs: any[], queueName: string): Promise<void> {
    let removedCount = 0

    for (const job of jobs) {
      try {
        await job.remove()
        removedCount++

        // Update analysis status if it's an analysis job
        if (job.data?.analysisId) {
          await this.markAnalysisAsFailed(job.data.analysisId, 'Job stalled')
        }
      } catch (error) {
        AppLogger.warn('Failed to remove stalled job', {
          service: 'queue-cleanup',
          operation: 'stalled_job_removal_failed',
          metadata: {
            queueName,
            jobId: job.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        })
      }
    }

    if (removedCount > 0) {
      AppLogger.info('Stalled jobs removed', {
        service: 'queue-cleanup',
        operation: 'stalled_jobs_removed',
        metadata: {
          queueName,
          removedCount
        }
      })
    }
  }

  /**
   * Handle analyses that have been stuck in processing state
   */
  private async handleOrphanedAnalyses(): Promise<void> {
    try {
      const orphanThreshold = new Date(Date.now() - this.config.staleJobAgeMs)
      
      const orphanedAnalyses = await prisma.analysis.findMany({
        where: {
          status: 'processing',
          startedAt: {
            lt: orphanThreshold
          }
        }
      })

      for (const analysis of orphanedAnalyses) {
        await this.markAnalysisAsFailed(analysis.id, 'Analysis orphaned - no active job found')
        this.metrics.orphanedAnalysesHandled++
      }

      if (orphanedAnalyses.length > 0) {
        AppLogger.business('Orphaned analyses handled', {
          service: 'queue-cleanup',
          operation: 'orphaned_analyses_handled',
          businessEvent: 'data_integrity',
          metadata: {
            count: orphanedAnalyses.length
          }
        })
      }

    } catch (error) {
      const errorMessage = `Failed to handle orphaned analyses: ${error instanceof Error ? error.message : 'Unknown error'}`
      this.metrics.errors.push(errorMessage)
      
      AppLogger.error('Failed to handle orphaned analyses', {
        service: 'queue-cleanup',
        operation: 'orphaned_analyses_error',
        metadata: {
          error: errorMessage
        }
      })
    }
  }

  /**
   * Clean up old completed/failed analyses
   */
  private async cleanupOldAnalyses(): Promise<void> {
    try {
      const oldThreshold = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)) // 30 days
      
      // Find old analyses to delete
      const oldAnalyses = await prisma.analysis.findMany({
        where: {
          OR: [
            { status: 'completed', completedAt: { lt: oldThreshold } },
            { status: 'failed', createdAt: { lt: oldThreshold } },
            { status: 'cancelled', createdAt: { lt: oldThreshold } }
          ]
        },
        select: { id: true }
      })

      if (oldAnalyses.length > 0) {
        const analysisIds = oldAnalyses.map(a => a.id)
        
        // Delete related records first (due to foreign key constraints)
        await prisma.costEvent.deleteMany({
          where: { analysisId: { in: analysisIds } }
        })
        
        await prisma.opportunity.deleteMany({
          where: { analysisId: { in: analysisIds } }
        })
        
        await prisma.redditComment.deleteMany({
          where: { 
            post: { 
              analysisId: { in: analysisIds } 
            } 
          }
        })
        
        await prisma.redditPost.deleteMany({
          where: { analysisId: { in: analysisIds } }
        })
        
        // Finally delete the analyses
        await prisma.analysis.deleteMany({
          where: { id: { in: analysisIds } }
        })

        AppLogger.business('Old analyses cleaned up', {
          service: 'queue-cleanup',
          operation: 'old_analyses_cleanup',
          businessEvent: 'data_retention',
          metadata: {
            count: oldAnalyses.length,
            olderThan: oldThreshold.toISOString()
          }
        })
      }

    } catch (error) {
      const errorMessage = `Failed to cleanup old analyses: ${error instanceof Error ? error.message : 'Unknown error'}`
      this.metrics.errors.push(errorMessage)
      
      AppLogger.error('Failed to cleanup old analyses', {
        service: 'queue-cleanup',
        operation: 'old_analyses_cleanup_error',
        metadata: {
          error: errorMessage
        }
      })
    }
  }

  /**
   * Mark an analysis as failed
   */
  private async markAnalysisAsFailed(analysisId: string, reason: string): Promise<void> {
    try {
      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'failed',
          errorDetails: JSON.stringify({
            type: 'JOB_CLEANUP',
            message: reason,
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (error) {
      AppLogger.error('Failed to mark analysis as failed', {
        service: 'queue-cleanup',
        operation: 'mark_analysis_failed_error',
        metadata: {
          analysisId,
          reason,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * Get current metrics
   */
  public getMetrics(): CleanupMetrics {
    return { ...this.metrics }
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      totalJobsProcessed: 0,
      staleJobsRemoved: 0,
      failedJobsRetried: 0,
      failedJobsRemoved: 0,
      orphanedAnalysesHandled: 0,
      lastCleanupTime: new Date(),
      errors: []
    }

    AppLogger.info('Queue cleanup metrics reset', {
      service: 'queue-cleanup',
      operation: 'metrics_reset'
    })
  }

  /**
   * Get service status
   */
  public getStatus(): { isRunning: boolean; config: CleanupConfig; metrics: CleanupMetrics } {
    return {
      isRunning: this.isRunning,
      config: { ...this.config },
      metrics: { ...this.metrics }
    }
  }
}

// Default configuration
export const defaultCleanupConfig: CleanupConfig = {
  staleJobAgeMs: 2 * 60 * 60 * 1000, // 2 hours
  maxFailedJobs: 100,
  cleanupIntervalMs: 30 * 60 * 1000, // 30 minutes
  retryAttempts: 3
}

// Singleton instance
export const queueCleanupService = new QueueCleanupService(defaultCleanupConfig)