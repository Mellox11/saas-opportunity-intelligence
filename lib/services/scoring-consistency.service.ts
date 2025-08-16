import { prisma } from '@/lib/db'
import { AppLogger } from '@/lib/observability/logger'
import { DimensionalAnalysis, QUALITY_THRESHOLDS } from '@/lib/types/dimensional-analysis'

/**
 * Scoring Consistency Service for quality metrics tracking
 * AC: 6 - Historical scoring consistency tracked and reported for quality improvement metrics
 * AC: 10 - Quality metrics show scoring confidence and reliability for each opportunity
 */
export class ScoringConsistencyService {
  /**
   * Update consistency metrics after dimensional analysis
   */
  async updateConsistencyMetrics(
    analysisId: string,
    dimensions: DimensionalAnalysis
  ): Promise<void> {
    try {
      AppLogger.info('Updating scoring consistency metrics', {
        service: 'scoring-consistency',
        operation: 'update_metrics',
        metadata: {
          analysisId,
          compositeScore: dimensions.compositeScore,
          confidenceScore: dimensions.confidenceScore
        }
      })

      // Get similar opportunities for comparison
      const similarOpportunities = await this.getSimilarOpportunities(analysisId, dimensions)

      // Update metrics for each dimension
      await Promise.all([
        // Scored dimensions
        this.updateDimensionMetrics(analysisId, 'emotionLevel', dimensions.emotionLevel, similarOpportunities),
        this.updateDimensionMetrics(analysisId, 'marketSize', dimensions.marketSize, similarOpportunities),
        this.updateDimensionMetrics(analysisId, 'technicalComplexity', dimensions.technicalComplexity, similarOpportunities),
        this.updateDimensionMetrics(analysisId, 'existingSolutions', dimensions.existingSolutions, similarOpportunities),
        this.updateDimensionMetrics(analysisId, 'budgetContext', dimensions.budgetContext, similarOpportunities),
        this.updateDimensionMetrics(analysisId, 'timeSensitivity', dimensions.timeSensitivity, similarOpportunities),

        // Classified dimensions (only confidence tracking)
        this.updateClassificationMetrics(analysisId, 'persona', dimensions.persona, similarOpportunities),
        this.updateClassificationMetrics(analysisId, 'industryVertical', dimensions.industryVertical, similarOpportunities),
        this.updateClassificationMetrics(analysisId, 'userRole', dimensions.userRole, similarOpportunities),
        this.updateClassificationMetrics(analysisId, 'workflowStage', dimensions.workflowStage, similarOpportunities)
      ])

      AppLogger.info('Scoring consistency metrics updated successfully', {
        service: 'scoring-consistency',
        operation: 'update_metrics_completed',
        metadata: { analysisId }
      })

    } catch (error) {
      AppLogger.error('Failed to update consistency metrics', {
        service: 'scoring-consistency',
        operation: 'update_metrics_error',
        metadata: {
          analysisId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      throw error
    }
  }

  /**
   * Update metrics for scored dimensions
   */
  private async updateDimensionMetrics(
    analysisId: string,
    dimensionName: string,
    dimension: { score: number; confidence: number },
    similarOpportunities: any[]
  ): Promise<void> {
    // Calculate statistics from similar opportunities
    const scores = similarOpportunities
      .map(opp => this.extractDimensionScore(opp.scoringDimensions, dimensionName))
      .filter(score => score !== null) as number[]

    const confidences = similarOpportunities
      .map(opp => this.extractDimensionConfidence(opp.scoringDimensions, dimensionName))
      .filter(conf => conf !== null) as number[]

    scores.push(dimension.score)
    confidences.push(dimension.confidence)

    const averageScore = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : dimension.score
    const averageConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length
    
    const standardDeviation = this.calculateStandardDeviation(scores)

    // Get accuracy rate from user feedback
    const accuracyRate = await this.calculateAccuracyRate(analysisId, dimensionName)

    // Upsert metrics
    await prisma.scoringConsistencyMetrics.upsert({
      where: {
        analysisId_dimensionName: {
          analysisId,
          dimensionName
        }
      },
      update: {
        averageScore,
        averageConfidence,
        standardDeviation,
        sampleSize: scores.length,
        accuracyRate,
        lastUpdated: new Date()
      },
      create: {
        analysisId,
        dimensionName,
        averageScore,
        averageConfidence,
        standardDeviation,
        sampleSize: scores.length,
        accuracyRate,
        createdAt: new Date(),
        lastUpdated: new Date()
      }
    })
  }

  /**
   * Update metrics for classification dimensions
   */
  private async updateClassificationMetrics(
    analysisId: string,
    dimensionName: string,
    dimension: { confidence: number },
    similarOpportunities: any[]
  ): Promise<void> {
    // For classifications, we only track confidence
    const confidences = similarOpportunities
      .map(opp => this.extractDimensionConfidence(opp.scoringDimensions, dimensionName))
      .filter(conf => conf !== null) as number[]

    confidences.push(dimension.confidence)

    const averageConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length
    const accuracyRate = await this.calculateAccuracyRate(analysisId, dimensionName)

    await prisma.scoringConsistencyMetrics.upsert({
      where: {
        analysisId_dimensionName: {
          analysisId,
          dimensionName
        }
      },
      update: {
        averageScore: null, // Classifications don't have scores
        averageConfidence,
        standardDeviation: null,
        sampleSize: confidences.length,
        accuracyRate,
        lastUpdated: new Date()
      },
      create: {
        analysisId,
        dimensionName,
        averageScore: null,
        averageConfidence,
        standardDeviation: null,
        sampleSize: confidences.length,
        accuracyRate,
        createdAt: new Date(),
        lastUpdated: new Date()
      }
    })
  }

  /**
   * Get similar opportunities for comparison (same user, similar timeframe)
   */
  private async getSimilarOpportunities(
    analysisId: string,
    dimensions: DimensionalAnalysis
  ): Promise<any[]> {
    // Get opportunities from the same analysis and recent analyses from same user
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      select: { userId: true, createdAt: true }
    })

    if (!analysis) return []

    // Find opportunities from last 30 days from same user
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const opportunities = await prisma.opportunity.findMany({
      where: {
        analysis: {
          userId: analysis.userId,
          createdAt: {
            gte: thirtyDaysAgo
          }
        },
        scoringDimensions: {
          not: '{}'
        }
      },
      select: {
        scoringDimensions: true
      },
      take: 100 // Limit for performance
    })

    return opportunities
  }

  /**
   * Extract dimension score from stored JSON
   */
  private extractDimensionScore(scoringDimensionsJson: string, dimensionName: string): number | null {
    try {
      const dimensions = JSON.parse(scoringDimensionsJson)
      return dimensions[dimensionName]?.score || null
    } catch {
      return null
    }
  }

  /**
   * Extract dimension confidence from stored JSON
   */
  private extractDimensionConfidence(scoringDimensionsJson: string, dimensionName: string): number | null {
    try {
      const dimensions = JSON.parse(scoringDimensionsJson)
      return dimensions[dimensionName]?.confidence || null
    } catch {
      return null
    }
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length <= 1) return 0
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length
    
    return Math.sqrt(avgSquaredDiff)
  }

  /**
   * Calculate accuracy rate based on user feedback
   */
  private async calculateAccuracyRate(analysisId: string, dimensionName: string): Promise<number | null> {
    try {
      const feedback = await prisma.dimensionFeedback.findMany({
        where: {
          opportunity: {
            analysisId
          },
          dimensionName
        },
        select: {
          userRating: true
        }
      })

      if (feedback.length === 0) return null

      const positiveCount = feedback.filter(f => f.userRating === 'positive').length
      return (positiveCount / feedback.length) * 100

    } catch (error) {
      AppLogger.error('Failed to calculate accuracy rate', {
        service: 'scoring-consistency',
        operation: 'calculate_accuracy_error',
        metadata: {
          analysisId,
          dimensionName,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      return null
    }
  }

  /**
   * Get quality report for an analysis
   */
  async getQualityReport(analysisId: string): Promise<{
    overallQuality: 'high' | 'medium' | 'low'
    metrics: Record<string, {
      averageScore?: number
      averageConfidence: number
      standardDeviation?: number
      sampleSize: number
      accuracyRate?: number
      qualityIndicator: 'good' | 'warning' | 'poor'
    }>
    recommendations: string[]
  }> {
    const metrics = await prisma.scoringConsistencyMetrics.findMany({
      where: { analysisId }
    })

    const qualityMetrics: Record<string, any> = {}
    const recommendations: string[] = []
    let totalQuality = 0
    let qualityCount = 0

    for (const metric of metrics) {
      const qualityIndicator = this.assessDimensionQuality(metric)
      
      qualityMetrics[metric.dimensionName] = {
        averageScore: metric.averageScore,
        averageConfidence: metric.averageConfidence,
        standardDeviation: metric.standardDeviation,
        sampleSize: metric.sampleSize,
        accuracyRate: metric.accuracyRate,
        qualityIndicator
      }

      // Convert quality to numeric for overall calculation
      const qualityScore = qualityIndicator === 'good' ? 3 : qualityIndicator === 'warning' ? 2 : 1
      totalQuality += qualityScore
      qualityCount++

      // Generate recommendations
      if (qualityIndicator === 'poor') {
        if (metric.averageConfidence < QUALITY_THRESHOLDS.minConfidence) {
          recommendations.push(`${metric.dimensionName}: Low confidence scores indicate unclear analysis criteria`)
        }
        if (metric.accuracyRate && metric.accuracyRate < 70) {
          recommendations.push(`${metric.dimensionName}: User feedback indicates accuracy issues`)
        }
      }
    }

    const averageQuality = qualityCount > 0 ? totalQuality / qualityCount : 2
    const overallQuality = averageQuality >= 2.5 ? 'high' : averageQuality >= 1.5 ? 'medium' : 'low'

    return {
      overallQuality,
      metrics: qualityMetrics,
      recommendations
    }
  }

  /**
   * Assess quality of individual dimension
   */
  private assessDimensionQuality(metric: any): 'good' | 'warning' | 'poor' {
    let score = 0

    // Confidence assessment
    if (metric.averageConfidence >= 0.8) score += 2
    else if (metric.averageConfidence >= 0.6) score += 1

    // Accuracy assessment (if available)
    if (metric.accuracyRate !== null) {
      if (metric.accuracyRate >= 80) score += 2
      else if (metric.accuracyRate >= 60) score += 1
    } else {
      score += 1 // Neutral if no feedback yet
    }

    // Consistency assessment (for scored dimensions)
    if (metric.standardDeviation !== null) {
      if (metric.standardDeviation <= 1.5) score += 1
      else if (metric.standardDeviation <= 2.5) score += 0.5
    }

    // Sample size consideration
    if (metric.sampleSize >= 10) score += 0.5
    else if (metric.sampleSize >= 5) score += 0.25

    // Determine quality level
    if (score >= 4) return 'good'
    if (score >= 2.5) return 'warning'
    return 'poor'
  }
}