import { AppLogger } from '@/lib/observability/logger'
import { analysisQueue, redditCollectionQueue, aiProcessingQueue, reportGenerationQueue } from '@/lib/queues/queue-config'

export interface JobMetrics {
  name: string
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: number
  stalled: number
  totalProcessed: number
  processingRate: number // jobs per minute
  averageProcessingTime: number // milliseconds
  failureRate: number // percentage
  lastJobCompletedAt?: Date
  lastJobFailedAt?: Date
  healthStatus: 'healthy' | 'warning' | 'critical'
}

export interface SystemMetrics {
  totalJobs: number
  totalActiveJobs: number
  totalFailedJobs: number
  totalCompletedJobs: number
  overallHealthStatus: 'healthy' | 'degraded' | 'critical'
  queues: Record<string, JobMetrics>
  lastUpdated: Date
}

export interface AlertConfig {
  maxWaitingJobs: number
  maxFailureRate: number
  maxStalledJobs: number
  maxProcessingTime: number
  minProcessingRate: number
}

export class JobMonitoringService {
  private isRunning = false
  private monitoringInterval?: NodeJS.Timeout
  private metricsHistory: Map<string, JobMetrics[]> = new Map()
  private lastMetrics?: SystemMetrics
  private alerts: string[] = []

  constructor(
    private alertConfig: AlertConfig,
    private monitoringIntervalMs: number = 30000 // 30 seconds
  ) {}

  /**
   * Start monitoring service
   */
  public start(): void {
    if (this.isRunning) {
      AppLogger.warn('Job monitoring service already running', {
        service: 'job-monitoring',
        operation: 'start_attempted'
      })
      return
    }

    this.isRunning = true
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics().catch(error => {
        AppLogger.error('Job monitoring metrics collection failed', {
          service: 'job-monitoring',
          operation: 'metrics_collection_error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      })
    }, this.monitoringIntervalMs)

    // Collect initial metrics
    this.collectMetrics()

    AppLogger.info('Job monitoring service started', {
      service: 'job-monitoring',
      operation: 'service_started',
      monitoringInterval: this.monitoringIntervalMs,
      alertConfig: this.alertConfig
    })
  }

  /**
   * Stop monitoring service
   */
  public stop(): void {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }

    AppLogger.info('Job monitoring service stopped', {
      service: 'job-monitoring',
      operation: 'service_stopped',
      finalMetrics: this.lastMetrics
    })
  }

  /**
   * Collect metrics from all queues
   */
  public async collectMetrics(): Promise<SystemMetrics> {
    try {
      const queues = [
        { name: 'analysis', queue: analysisQueue },
        { name: 'reddit-collection', queue: redditCollectionQueue },
        { name: 'ai-processing', queue: aiProcessingQueue },
        { name: 'report-generation', queue: reportGenerationQueue }
      ]

      const queueMetrics: Record<string, JobMetrics> = {}
      let totalJobs = 0
      let totalActiveJobs = 0
      let totalFailedJobs = 0
      let totalCompletedJobs = 0

      for (const { name, queue } of queues) {
        const metrics = await this.collectQueueMetrics(name, queue)
        queueMetrics[name] = metrics
        
        totalJobs += metrics.waiting + metrics.active + metrics.completed + metrics.failed
        totalActiveJobs += metrics.active
        totalFailedJobs += metrics.failed
        totalCompletedJobs += metrics.completed

        // Store metrics history for trend analysis
        this.storeMetricsHistory(name, metrics)
      }

      const systemMetrics: SystemMetrics = {
        totalJobs,
        totalActiveJobs,
        totalFailedJobs,
        totalCompletedJobs,
        overallHealthStatus: this.calculateOverallHealth(queueMetrics),
        queues: queueMetrics,
        lastUpdated: new Date()
      }

      this.lastMetrics = systemMetrics
      
      // Check for alerts
      await this.checkAlerts(systemMetrics)

      AppLogger.debug('Job metrics collected', {
        service: 'job-monitoring',
        operation: 'metrics_collected',
        totalJobs,
        totalActiveJobs,
        totalFailedJobs,
        overallHealth: systemMetrics.overallHealthStatus
      })

      return systemMetrics

    } catch (error) {
      AppLogger.error('Failed to collect job metrics', {
        service: 'job-monitoring',
        operation: 'metrics_collection_failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Collect metrics for a specific queue
   */
  private async collectQueueMetrics(name: string, queue: any): Promise<JobMetrics> {
    try {
      const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed(),
        queue.getPaused()
      ])

      // Calculate stalled jobs (active jobs that haven't been updated recently)
      const stalledThreshold = Date.now() - (5 * 60 * 1000) // 5 minutes
      const stalled = active.filter((job: any) => 
        job.processedOn && job.processedOn < stalledThreshold
      )

      // Calculate processing metrics
      const recentJobs = [...completed, ...failed].slice(-100) // Last 100 jobs
      const processingTimes = recentJobs
        .filter((job: any) => job.finishedOn && job.processedOn)
        .map((job: any) => job.finishedOn - job.processedOn)
      
      const averageProcessingTime = processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
        : 0

      // Calculate processing rate (jobs per minute over last hour)
      const oneHourAgo = Date.now() - (60 * 60 * 1000)
      const recentCompletedJobs = completed.filter((job: any) => 
        job.finishedOn && job.finishedOn > oneHourAgo
      )
      const processingRate = recentCompletedJobs.length

      // Calculate failure rate
      const totalProcessed = completed.length + failed.length
      const failureRate = totalProcessed > 0 ? (failed.length / totalProcessed) * 100 : 0

      // Find most recent job times
      const lastJobCompletedAt = completed.length > 0 
        ? new Date(Math.max(...completed.map((job: any) => job.finishedOn)))
        : undefined

      const lastJobFailedAt = failed.length > 0
        ? new Date(Math.max(...failed.map((job: any) => job.finishedOn)))
        : undefined

      // Determine health status
      const healthStatus = this.calculateQueueHealth({
        waiting: waiting.length,
        failed: failed.length,
        stalled: stalled.length,
        failureRate,
        averageProcessingTime,
        processingRate
      })

      return {
        name,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: paused.length,
        stalled: stalled.length,
        totalProcessed,
        processingRate,
        averageProcessingTime,
        failureRate,
        lastJobCompletedAt,
        lastJobFailedAt,
        healthStatus
      }

    } catch (error) {
      AppLogger.error('Failed to collect queue metrics', {
        service: 'job-monitoring',
        operation: 'queue_metrics_failed',
        queueName: name,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      // Return empty metrics on error
      return {
        name,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0,
        stalled: 0,
        totalProcessed: 0,
        processingRate: 0,
        averageProcessingTime: 0,
        failureRate: 0,
        healthStatus: 'critical'
      }
    }
  }

  /**
   * Calculate health status for a queue
   */
  private calculateQueueHealth(metrics: {
    waiting: number
    failed: number
    stalled: number
    failureRate: number
    averageProcessingTime: number
    processingRate: number
  }): 'healthy' | 'warning' | 'critical' {
    if (
      metrics.stalled > this.alertConfig.maxStalledJobs ||
      metrics.failureRate > this.alertConfig.maxFailureRate ||
      metrics.averageProcessingTime > this.alertConfig.maxProcessingTime
    ) {
      return 'critical'
    }

    if (
      metrics.waiting > this.alertConfig.maxWaitingJobs ||
      metrics.processingRate < this.alertConfig.minProcessingRate ||
      metrics.failureRate > this.alertConfig.maxFailureRate * 0.5
    ) {
      return 'warning'
    }

    return 'healthy'
  }

  /**
   * Calculate overall system health
   */
  private calculateOverallHealth(queues: Record<string, JobMetrics>): 'healthy' | 'degraded' | 'critical' {
    const queueHealthStatuses = Object.values(queues).map(q => q.healthStatus)
    
    if (queueHealthStatuses.some(status => status === 'critical')) {
      return 'critical'
    }

    if (queueHealthStatuses.some(status => status === 'warning')) {
      return 'degraded'
    }

    return 'healthy'
  }

  /**
   * Store metrics history for trend analysis
   */
  private storeMetricsHistory(queueName: string, metrics: JobMetrics): void {
    const history = this.metricsHistory.get(queueName) || []
    history.push(metrics)
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift()
    }
    
    this.metricsHistory.set(queueName, history)
  }

  /**
   * Check for alerts based on current metrics
   */
  private async checkAlerts(metrics: SystemMetrics): Promise<void> {
    this.alerts = []

    for (const [queueName, queueMetrics] of Object.entries(metrics.queues)) {
      // Check waiting jobs
      if (queueMetrics.waiting > this.alertConfig.maxWaitingJobs) {
        this.alerts.push(`Queue ${queueName} has ${queueMetrics.waiting} waiting jobs (threshold: ${this.alertConfig.maxWaitingJobs})`)
      }

      // Check failure rate
      if (queueMetrics.failureRate > this.alertConfig.maxFailureRate) {
        this.alerts.push(`Queue ${queueName} failure rate is ${queueMetrics.failureRate.toFixed(2)}% (threshold: ${this.alertConfig.maxFailureRate}%)`)
      }

      // Check stalled jobs
      if (queueMetrics.stalled > this.alertConfig.maxStalledJobs) {
        this.alerts.push(`Queue ${queueName} has ${queueMetrics.stalled} stalled jobs (threshold: ${this.alertConfig.maxStalledJobs})`)
      }

      // Check processing time
      if (queueMetrics.averageProcessingTime > this.alertConfig.maxProcessingTime) {
        this.alerts.push(`Queue ${queueName} average processing time is ${Math.round(queueMetrics.averageProcessingTime)}ms (threshold: ${this.alertConfig.maxProcessingTime}ms)`)
      }

      // Check processing rate
      if (queueMetrics.processingRate < this.alertConfig.minProcessingRate) {
        this.alerts.push(`Queue ${queueName} processing rate is ${queueMetrics.processingRate} jobs/hour (threshold: ${this.alertConfig.minProcessingRate} jobs/hour)`)
      }
    }

    if (this.alerts.length > 0) {
      AppLogger.business('Job monitoring alerts triggered', {
        service: 'job-monitoring',
        operation: 'alerts_triggered',
        businessEvent: 'system_health',
        alertCount: this.alerts.length,
        alerts: this.alerts,
        overallHealth: metrics.overallHealthStatus
      })
    }
  }

  /**
   * Get current metrics
   */
  public getCurrentMetrics(): SystemMetrics | undefined {
    return this.lastMetrics
  }

  /**
   * Get metrics history for a queue
   */
  public getQueueHistory(queueName: string): JobMetrics[] {
    return this.metricsHistory.get(queueName) || []
  }

  /**
   * Get current alerts
   */
  public getAlerts(): string[] {
    return [...this.alerts]
  }

  /**
   * Get service status
   */
  public getStatus(): {
    isRunning: boolean
    alertConfig: AlertConfig
    lastMetrics?: SystemMetrics
    currentAlerts: string[]
  } {
    return {
      isRunning: this.isRunning,
      alertConfig: { ...this.alertConfig },
      lastMetrics: this.lastMetrics,
      currentAlerts: this.getAlerts()
    }
  }

  /**
   * Update alert configuration
   */
  public updateAlertConfig(newConfig: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...newConfig }
    
    AppLogger.info('Job monitoring alert config updated', {
      service: 'job-monitoring',
      operation: 'config_updated',
      newConfig: this.alertConfig
    })
  }
}

// Default alert configuration
export const defaultAlertConfig: AlertConfig = {
  maxWaitingJobs: 100,
  maxFailureRate: 10, // 10%
  maxStalledJobs: 5,
  maxProcessingTime: 300000, // 5 minutes
  minProcessingRate: 10 // 10 jobs per hour
}

// Singleton instance
export const jobMonitoringService = new JobMonitoringService(defaultAlertConfig)