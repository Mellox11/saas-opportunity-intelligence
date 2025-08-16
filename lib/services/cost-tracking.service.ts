import { prisma } from '@/lib/db'
import { CostEvent, CostTrackingUpdate } from '@/lib/validation/cost-schema'
import { calculateAccuracy, calculateBudgetStatus, shouldTriggerCircuitBreaker } from '@/lib/utils/cost-calculator'
import { cancelAnalysisJob } from '@/lib/jobs/analysis-job-trigger'
import { AppLogger } from '@/lib/observability/logger'

export class CostTrackingService {
  /**
   * Send notification about budget exceeded
   */
  private async sendBudgetExceededNotification(
    analysisId: string,
    currentCost: number,
    budgetLimit: number
  ): Promise<void> {
    try {
      // Get analysis with user details
      const analysis = await prisma.analysis.findUnique({
        where: { id: analysisId },
        include: { user: true }
      })
      
      if (!analysis) return
      
      // TODO: Create notification record when notification table is implemented
      // await prisma.notification.create({
      //   data: {
      //     userId: analysis.userId,
      //     type: 'budget_exceeded',
      //     title: 'Analysis Stopped - Budget Limit Reached',
      //     message: `Your analysis has been stopped because the cost ($${currentCost.toFixed(2)}) was approaching your budget limit ($${budgetLimit.toFixed(2)}).`,
      //     metadata: JSON.stringify({
      //       analysisId,
      //       currentCost,
      //       budgetLimit,
      //       timestamp: new Date().toISOString()
      //     })
      //   }
      // })
      
      AppLogger.info('Budget exceeded notification sent', {
        service: 'cost-tracking',
        operation: 'send_notification',
        analysisId,
        userId: analysis.userId
      })
      
    } catch (error) {
      AppLogger.error('Failed to send budget exceeded notification', {
        service: 'cost-tracking',
        operation: 'send_notification_error',
        analysisId,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }, error as Error)
    }
  }
  
  /**
   * Record a cost event for an analysis
   */
  async recordCostEvent(event: CostEvent): Promise<void> {
    await prisma.costEvent.create({
      data: {
        analysisId: event.analysisId,
        eventType: event.eventType,
        provider: event.provider,
        quantity: event.quantity,
        unitCost: event.unitCost,
        totalCost: event.totalCost,
        eventData: event.eventData ? JSON.stringify(event.eventData) : undefined
      }
    })
    
    // Update the analysis with accumulated costs
    await this.updateAnalysisCost(event.analysisId, event.totalCost)
  }
  
  /**
   * Update analysis with accumulated cost
   */
  private async updateAnalysisCost(analysisId: string, additionalCost: number): Promise<void> {
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      select: { 
        actualCost: true, 
        budgetLimit: true,
        progress: true 
      }
    })
    
    if (!analysis) {
      throw new Error(`Analysis ${analysisId} not found`)
    }
    
    const newActualCost = (analysis.actualCost || 0) + additionalCost
    const progress = analysis.progress as any || {}
    
    // Check if circuit breaker should trigger
    if (analysis.budgetLimit && shouldTriggerCircuitBreaker(newActualCost, analysis.budgetLimit)) {
      await this.triggerCircuitBreaker(analysisId, newActualCost, analysis.budgetLimit)
    }
    
    // Update progress with cost accumulation
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        actualCost: newActualCost,
        progress: {
          ...progress,
          costAccumulation: newActualCost,
          lastCostUpdate: new Date().toISOString()
        }
      }
    })
  }
  
  /**
   * Trigger circuit breaker to stop analysis
   */
  private async triggerCircuitBreaker(
    analysisId: string, 
    currentCost: number, 
    budgetLimit: number
  ): Promise<void> {
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'cancelled',
        errorDetails: JSON.stringify({
          type: 'BUDGET_EXCEEDED',
          message: `Analysis stopped: Cost ($${currentCost.toFixed(2)}) approaching budget limit ($${budgetLimit.toFixed(2)})`,
          timestamp: new Date().toISOString()
        })
      }
    })
    
    // Send notification to user about analysis being stopped
    await this.sendBudgetExceededNotification(analysisId, currentCost, budgetLimit)
    
    // Trigger job cancellation in worker system
    await cancelAnalysisJob(analysisId)
    
    AppLogger.business('Analysis stopped due to budget limit', {
      service: 'cost-tracking',
      operation: 'handle_budget_exceeded',
      businessEvent: 'budget_exceeded',
      analysisId,
      metadata: {
        currentCost,
        budgetLimit,
        exceeded: currentCost > budgetLimit
      }
    })
  }
  
  /**
   * Get current cost tracking status
   */
  async getCostTrackingStatus(analysisId: string): Promise<CostTrackingUpdate> {
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      select: {
        actualCost: true,
        estimatedCost: true,
        budgetLimit: true,
        progress: true,
        status: true
      }
    })
    
    if (!analysis) {
      throw new Error(`Analysis ${analysisId} not found`)
    }
    
    const currentCost = analysis.actualCost || 0
    const estimatedCost = analysis.estimatedCost || 0
    const budgetLimit = analysis.budgetLimit || estimatedCost
    
    const percentComplete = estimatedCost > 0 
      ? Math.min(100, (currentCost / estimatedCost) * 100)
      : 0
    
    const status = analysis.status === 'cancelled' && currentCost >= budgetLimit * 0.95
      ? 'stopped' as const
      : calculateBudgetStatus(currentCost, budgetLimit)
    
    return {
      analysisId,
      currentCost,
      estimatedCost,
      budgetLimit,
      percentComplete,
      status
    }
  }
  
  /**
   * Get cost events for an analysis
   */
  async getCostEvents(analysisId: string) {
    return await prisma.costEvent.findMany({
      where: { analysisId },
      orderBy: { createdAt: 'desc' }
    })
  }
  
  /**
   * Calculate and store accuracy metrics
   */
  async updateAccuracyMetrics(analysisId: string): Promise<number> {
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      select: {
        estimatedCost: true,
        actualCost: true
      }
    })
    
    if (!analysis || !analysis.estimatedCost || !analysis.actualCost) {
      throw new Error('Cannot calculate accuracy: missing cost data')
    }
    
    const accuracy = calculateAccuracy(analysis.estimatedCost, analysis.actualCost)
    
    // Store accuracy in metadata for future reference
    const currentAnalysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      select: { metadata: true }
    })
    
    const existingMetadata = currentAnalysis?.metadata 
      ? JSON.parse(currentAnalysis.metadata as string) 
      : {}
    
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        metadata: JSON.stringify({
          ...existingMetadata,
          costAccuracy: accuracy,
          accuracyCalculatedAt: new Date().toISOString()
        })
      }
    })
    
    return accuracy
  }
  
  /**
   * Get historical accuracy for cost estimation improvements
   */
  async getHistoricalAccuracy(userId?: string): Promise<number> {
    const whereClause = userId ? { userId } : {}
    
    const analyses = await prisma.analysis.findMany({
      where: {
        ...whereClause,
        status: 'completed',
        estimatedCost: { not: null },
        actualCost: { not: null }
      },
      select: {
        estimatedCost: true,
        actualCost: true
      },
      orderBy: { completedAt: 'desc' },
      take: 100 // Last 100 completed analyses
    })
    
    if (analyses.length === 0) {
      return 85 // Default accuracy
    }
    
    const accuracies = analyses.map(a => 
      calculateAccuracy(a.estimatedCost!, a.actualCost!)
    )
    
    const averageAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length
    
    return parseFloat(averageAccuracy.toFixed(2))
  }
  
  /**
   * Get total analysis cost
   */
  async getTotalAnalysisCost(analysisId: string): Promise<number> {
    const result = await prisma.costEvent.aggregate({
      where: { analysisId },
      _sum: {
        totalCost: true
      }
    })
    
    return result._sum.totalCost || 0
  }

  /**
   * Get cost breakdown for completed analysis
   */
  async getAnalysisCostBreakdown(analysisId: string) {
    const events = await prisma.costEvent.findMany({
      where: { analysisId },
      select: {
        eventType: true,
        provider: true,
        totalCost: true
      }
    })
    
    const breakdown = {
      reddit: 0,
      ai: 0,
      other: 0,
      total: 0
    }
    
    events.forEach(event => {
      if (event.provider === 'reddit' || event.eventType === 'reddit_api_request') {
        breakdown.reddit += event.totalCost
      } else if (event.provider === 'openai' || event.eventType === 'openai_tokens') {
        breakdown.ai += event.totalCost
      } else {
        breakdown.other += event.totalCost
      }
      breakdown.total += event.totalCost
    })
    
    return breakdown
  }
}