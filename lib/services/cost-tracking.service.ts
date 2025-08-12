import { prisma } from '@/lib/db'
import { CostEvent, CostTrackingUpdate } from '@/lib/validation/cost-schema'
import { calculateAccuracy, calculateBudgetStatus, shouldTriggerCircuitBreaker } from '@/lib/utils/cost-calculator'

export class CostTrackingService {
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
        eventData: event.eventData || {}
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
        errorDetails: {
          type: 'BUDGET_EXCEEDED',
          message: `Analysis stopped: Cost ($${currentCost.toFixed(2)}) approaching budget limit ($${budgetLimit.toFixed(2)})`,
          timestamp: new Date().toISOString()
        }
      }
    })
    
    // TODO: Send notification to user about analysis being stopped
    // TODO: Trigger job cancellation in worker system
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
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        metadata: {
          costAccuracy: accuracy,
          accuracyCalculatedAt: new Date().toISOString()
        }
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