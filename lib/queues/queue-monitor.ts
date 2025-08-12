import { queues, getQueueHealth } from './queue-config'

export class QueueMonitorService {
  private monitoringInterval?: NodeJS.Timeout
  
  /**
   * Start monitoring all queues
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
    
    console.log(`Starting queue monitoring with ${intervalMs}ms interval`)
    
    this.monitoringInterval = setInterval(async () => {
      try {
        const health = await getQueueHealth()
        this.logQueueStatus(health)
        
        // Check for stuck jobs
        await this.checkStuckJobs()
        
        // Clean up old jobs
        await this.cleanupOldJobs()
        
      } catch (error) {
        console.error('Queue monitoring error:', error)
      }
    }, intervalMs)
  }
  
  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
      console.log('Queue monitoring stopped')
    }
  }
  
  /**
   * Log queue status
   */
  private logQueueStatus(health: Awaited<ReturnType<typeof getQueueHealth>>): void {
    const summary = health.map(queue => 
      `${queue.name}: ${queue.status === 'healthy' ? '✅' : '❌'} ` +
      `(W:${queue.status === 'healthy' ? queue.counts?.waiting : '?'} ` +
      `A:${queue.status === 'healthy' ? queue.counts?.active : '?'} ` +
      `F:${queue.status === 'healthy' ? queue.counts?.failed : '?'})`
    ).join(' | ')
    
    console.log(`Queue Status: ${summary}`)
    
    // Alert on unhealthy queues
    const unhealthy = health.filter(q => q.status === 'unhealthy')
    if (unhealthy.length > 0) {
      console.error('⚠️  Unhealthy queues detected:', unhealthy)
    }
  }
  
  /**
   * Check for stuck jobs and retry them
   */
  private async checkStuckJobs(): Promise<void> {
    const stuckThreshold = 10 * 60 * 1000 // 10 minutes
    const now = Date.now()
    
    for (const [queueName, queue] of Object.entries(queues)) {
      try {
        const active = await queue.getActive()
        const stuckJobs = active.filter(job => 
          now - job.processedOn! > stuckThreshold
        )
        
        if (stuckJobs.length > 0) {
          console.warn(`Found ${stuckJobs.length} stuck jobs in ${queueName} queue`)
          
          // Optionally restart stuck jobs (be careful with this)
          for (const job of stuckJobs) {
            console.warn(`Stuck job detected: ${job.id} (${job.name})`)
            // Could implement automatic retry logic here
          }
        }
      } catch (error) {
        console.error(`Error checking stuck jobs for ${queueName}:`, error)
      }
    }
  }
  
  /**
   * Clean up old completed/failed jobs
   */
  private async cleanupOldJobs(): Promise<void> {
    const cleanupAge = 24 * 60 * 60 * 1000 // 24 hours
    
    for (const [queueName, queue] of Object.entries(queues)) {
      try {
        // Clean completed jobs older than 24 hours
        await queue.clean(cleanupAge, 'completed')
        await queue.clean(cleanupAge, 'failed')
      } catch (error) {
        console.error(`Error cleaning up ${queueName} queue:`, error)
      }
    }
  }
  
  /**
   * Get detailed queue metrics
   */
  async getQueueMetrics(): Promise<Record<string, any>> {
    const metrics: Record<string, any> = {}
    
    for (const [queueName, queue] of Object.entries(queues)) {
      try {
        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(), 
          queue.getCompleted(),
          queue.getFailed()
        ])
        
        metrics[queueName] = {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          total: waiting.length + active.length + completed.length + failed.length
        }
        
        // Add job processing times if available
        if (completed.length > 0) {
          const processingTimes = completed
            .filter(job => job.finishedOn && job.processedOn)
            .map(job => job.finishedOn! - job.processedOn!)
            .filter(time => time > 0)
          
          if (processingTimes.length > 0) {
            metrics[queueName].avgProcessingTime = Math.round(
              processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
            )
          }
        }
      } catch (error) {
        metrics[queueName] = { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
    
    return metrics
  }
  
  /**
   * Pause all queues
   */
  async pauseAllQueues(): Promise<void> {
    console.log('Pausing all queues...')
    await Promise.all(Object.values(queues).map(queue => queue.pause()))
    console.log('All queues paused')
  }
  
  /**
   * Resume all queues
   */
  async resumeAllQueues(): Promise<void> {
    console.log('Resuming all queues...')
    await Promise.all(Object.values(queues).map(queue => queue.resume()))
    console.log('All queues resumed')
  }
}

// Export singleton instance
export const queueMonitor = new QueueMonitorService()