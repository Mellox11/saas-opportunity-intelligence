import { analysisQueue } from '@/lib/queues/queue-config'
import { AppLogger } from '@/lib/observability/logger'
import { prisma } from '@/lib/db'

/**
 * Trigger analysis job in the worker system
 * Handles job creation and queue management
 */
export async function triggerAnalysisJob(analysisId: string): Promise<void> {
  try {
    // Check if queue is available
    if (!analysisQueue) {
      AppLogger.warn('Analysis queue not available, skipping job trigger', {
        service: 'analysis-job-trigger',
        operation: 'trigger_job',
        analysisId,
        reason: 'Queue not configured (Redis unavailable)'
      })
      
      // Update analysis to indicate manual processing needed
      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'queued',
          metadata: JSON.stringify({
            queueStatus: 'unavailable',
            message: 'Analysis queued for manual processing'
          })
        }
      })
      
      return
    }
    
    // Get analysis details
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      include: {
        user: true
      }
    })
    
    if (!analysis) {
      throw new Error(`Analysis ${analysisId} not found`)
    }
    
    // Create job in queue
    const job = await analysisQueue.add(
      'process-analysis',
      {
        analysisId,
        userId: analysis.userId,
        configuration: analysis.configuration,
        estimatedCost: analysis.estimatedCost,
        budgetLimit: analysis.budgetLimit,
        startedAt: new Date().toISOString()
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: false, // Keep for monitoring
        removeOnFail: false // Keep for debugging
      }
    )
    
    // Update analysis with job ID
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'processing',
        metadata: JSON.stringify({
          jobId: job.id,
          queuedAt: new Date().toISOString(),
          queue: 'analysis-processing'
        })
      }
    })
    
    AppLogger.business('Analysis job triggered successfully', {
      service: 'analysis-job-trigger',
      operation: 'job_triggered',
      businessEvent: 'analysis_started',
      analysisId,
      jobId: job.id.toString(),
      userId: analysis.userId
    })
    
  } catch (error) {
    AppLogger.error('Failed to trigger analysis job', {
      service: 'analysis-job-trigger',
      operation: 'trigger_job_error',
      analysisId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    // Update analysis status to failed
    try {
      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Failed to trigger job'
        }
      })
    } catch (updateError) {
      AppLogger.error('Failed to update analysis status after job trigger failure', {
        service: 'analysis-job-trigger',
        operation: 'status_update_error',
        analysisId,
        error: updateError instanceof Error ? updateError.message : 'Unknown error'
      })
    }
    
    throw error
  }
}

/**
 * Cancel an analysis job in the worker system
 * Handles job cancellation and cleanup
 */
export async function cancelAnalysisJob(analysisId: string): Promise<void> {
  try {
    // Check if queue is available
    if (!analysisQueue) {
      AppLogger.warn('Analysis queue not available, cannot cancel job', {
        service: 'analysis-job-trigger',
        operation: 'cancel_job',
        analysisId,
        reason: 'Queue not configured (Redis unavailable)'
      })
      
      // Update analysis status
      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'cancelled',
          metadata: JSON.stringify({
            cancelledAt: new Date().toISOString(),
            reason: 'User requested cancellation'
          })
        }
      })
      
      return
    }
    
    // Get analysis to find job ID
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId }
    })
    
    if (!analysis) {
      throw new Error(`Analysis ${analysisId} not found`)
    }
    
    // Parse metadata to get job ID
    let jobId: string | undefined
    if (analysis.metadata) {
      try {
        const metadata = JSON.parse(analysis.metadata as string)
        jobId = metadata.jobId
      } catch (error) {
        AppLogger.warn('Failed to parse analysis metadata for job ID', {
          service: 'analysis-job-trigger',
          operation: 'parse_metadata',
          analysisId
        })
      }
    }
    
    // Cancel job if found
    if (jobId) {
      const job = await analysisQueue.getJob(jobId)
      if (job) {
        await job.remove()
        
        AppLogger.business('Analysis job cancelled successfully', {
          service: 'analysis-job-trigger',
          operation: 'job_cancelled',
          businessEvent: 'analysis_cancelled',
          analysisId,
          jobId
        })
      } else {
        AppLogger.warn('Job not found in queue', {
          service: 'analysis-job-trigger',
          operation: 'job_not_found',
          analysisId,
          jobId
        })
      }
    }
    
    // Update analysis status
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'cancelled',
        metadata: JSON.stringify({
          cancelledAt: new Date().toISOString(),
          reason: 'User requested cancellation',
          jobId
        })
      }
    })
    
  } catch (error) {
    AppLogger.error('Failed to cancel analysis job', {
      service: 'analysis-job-trigger',
      operation: 'cancel_job_error',
      analysisId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    throw error
  }
}

/**
 * Retry a failed analysis job
 * Creates a new job for the analysis
 */
export async function retryAnalysisJob(analysisId: string): Promise<void> {
  try {
    // Reset analysis status
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'pending',
        error: null,
        metadata: JSON.stringify({
          retryRequestedAt: new Date().toISOString()
        })
      }
    })
    
    // Trigger new job
    await triggerAnalysisJob(analysisId)
    
    AppLogger.business('Analysis job retry initiated', {
      service: 'analysis-job-trigger',
      operation: 'job_retry',
      businessEvent: 'analysis_retried',
      analysisId
    })
    
  } catch (error) {
    AppLogger.error('Failed to retry analysis job', {
      service: 'analysis-job-trigger',
      operation: 'retry_job_error',
      analysisId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    throw error
  }
}