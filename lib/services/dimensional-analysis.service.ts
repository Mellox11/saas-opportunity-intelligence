import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { 
  DimensionalAnalysis, 
  DEFAULT_DIMENSION_WEIGHTS,
  QUALITY_THRESHOLDS 
} from '@/lib/types/dimensional-analysis'
import { 
  aiDimensionalResponseSchema,
  AIDimensionalResponse 
} from '@/lib/validation/dimensional-analysis-schema'
import { CommentAnalysisMetadata } from '@/lib/validation/reddit-schema'
import { AppLogger } from '@/lib/observability/logger'
import { CostTrackingService } from '@/lib/services/cost-tracking.service'
import { calculateEventCost } from '@/lib/utils/cost-calculator'

/**
 * Dimensional Analysis Service for 10-dimensional AI scoring
 * AC: 1 - AI extracts and analyzes 10 business dimensions
 * AC: 2 - Scored dimensions rated 1-10 with confidence intervals
 * AC: 4 - Analysis rationale provided for each dimension
 * AC: 9 - Scoring algorithm handles edge cases and missing information gracefully
 */
export class DimensionalAnalysisService {
  private costTrackingService: CostTrackingService | null
  private model = 'gpt-4-turbo-preview'

  constructor(private analysisId?: string, skipCostTracking: boolean = false) {
    this.costTrackingService = skipCostTracking ? null : new CostTrackingService()
  }

  /**
   * Analyze content across 10 business dimensions
   */
  async analyzeDimensions(
    content: string,
    postTitle: string,
    commentContext?: CommentAnalysisMetadata[]
  ): Promise<DimensionalAnalysis> {
    const startTime = Date.now()

    try {
      AppLogger.info('Starting dimensional analysis', {
        service: 'dimensional-analysis',
        operation: 'analyze_dimensions',
        metadata: {
          analysisId: this.analysisId,
          contentLength: content.length,
          hasCommentContext: !!commentContext
        }
      })

      // Build comprehensive prompt with comment context if available
      const prompt = this.buildDimensionalAnalysisPrompt(content, postTitle, commentContext)

      // Call AI for dimensional analysis
      const aiResponse = await generateObject({
        model: openai(this.model),
        schema: aiDimensionalResponseSchema,
        prompt,
        temperature: 0.3 // Lower temperature for consistent scoring
      })

      const processingTime = Date.now() - startTime

      // Track AI processing cost
      await this.trackDimensionalAnalysisCost(processingTime)

      // Transform AI response to full dimensional analysis
      const analysis = this.transformToAnalysis(aiResponse, processingTime)

      // Validate quality thresholds
      this.validateAnalysisQuality(analysis)

      AppLogger.info('Dimensional analysis completed', {
        service: 'dimensional-analysis',
        operation: 'analyze_dimensions_completed',
        metadata: {
          analysisId: this.analysisId,
          compositeScore: analysis.compositeScore,
          confidenceScore: analysis.confidenceScore,
          processingTimeMs: processingTime
        }
      })

      return analysis

    } catch (error) {
      const processingTime = Date.now() - startTime

      AppLogger.error('Dimensional analysis failed', {
        service: 'dimensional-analysis',
        operation: 'analyze_dimensions_error',
        metadata: {
          analysisId: this.analysisId,
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTimeMs: processingTime
        }
      })

      // Return fallback analysis with low confidence (AC: 9 - graceful handling)
      return this.createFallbackAnalysis(content, processingTime)
    }
  }

  /**
   * Build comprehensive AI prompt for dimensional analysis
   */
  private buildDimensionalAnalysisPrompt(
    content: string,
    postTitle: string,
    commentContext?: CommentAnalysisMetadata[]
  ): string {
    const commentSection = commentContext && commentContext.length > 0
      ? this.buildCommentContextSection(commentContext)
      : ''

    return `Analyze this Reddit post for SaaS opportunity assessment across 10 business dimensions.

POST TITLE: ${postTitle}

POST CONTENT: ${content}
${commentSection}

Please provide a comprehensive dimensional analysis with the following structure:

CLASSIFICATIONS (Categorical Dimensions):

1. PERSONA - Identify the specific role/profession of the person
   - Examples: dogwalker, freelance-designer, small-business-owner, software-engineer
   - Extract exact quotes that reveal their role
   - Consider alternatives if ambiguous

2. INDUSTRY VERTICAL - Classify the business sector
   - Examples: healthcare, e-commerce, education, retail, pet-services
   - Focus on the primary industry mentioned

3. USER ROLE - Identify organizational position and decision-making power
   - Examples: individual-contributor, team-lead, business-owner, decision-maker
   - Consider purchasing authority indicators

4. WORKFLOW STAGE - Determine where user is in problem-solving journey
   - Examples: problem-identification, solution-research, vendor-evaluation, growth-optimization
   - Look for readiness indicators

SCORES (Numerical Dimensions - Rate 1-10):

5. EMOTION LEVEL - Intensity of frustration or pain expressed
   - 1 = Mild annoyance, 10 = Extreme frustration
   - Look for emotional language and urgency

6. MARKET SIZE - Potential market opportunity and scalability
   - 1 = Very niche market, 10 = Massive market opportunity
   - Consider industry size and growth potential

7. TECHNICAL COMPLEXITY - Implementation difficulty
   - 1 = Simple to build, 10 = Extremely complex
   - Note: LOWER scores are better for SaaS viability

8. EXISTING SOLUTIONS - Level of competition and saturation
   - 1 = No competition, 10 = Highly saturated
   - Note: LOWER scores are better for opportunities

9. BUDGET CONTEXT - Financial capacity and willingness to pay
   - 1 = Very limited budget, 10 = Strong budget availability
   - Look for budget mentions, business size indicators

10. TIME SENSITIVITY - Urgency and time constraints
    - 1 = No urgency, 10 = Extremely urgent
    - Consider deadline mentions, frustration level

For each dimension provide:
- Value/Score with confidence level (0-1)
- At least 2-3 direct evidence quotes from the content
- Clear reasoning explaining your assessment
- For classifications, consider alternatives if ambiguous

Be thorough in evidence extraction and provide specific quotes rather than paraphrasing.`
  }

  /**
   * Build comment context section for enhanced analysis
   */
  private buildCommentContextSection(commentContext: CommentAnalysisMetadata[]): string {
    const positiveComments = commentContext.filter(c => c.sentimentScore > 0.3).length
    const negativeComments = commentContext.filter(c => c.sentimentScore < -0.3).length
    const agreements = commentContext.filter(c => c.validationSignals.agreement).length
    const disagreements = commentContext.filter(c => c.validationSignals.disagreement).length

    return `

COMMENT CONTEXT (${commentContext.length} comments analyzed):
- Positive sentiment: ${positiveComments} comments
- Negative sentiment: ${negativeComments} comments
- Agreement signals: ${agreements} comments
- Disagreement signals: ${disagreements} comments
- Average enthusiasm: ${this.calculateAverageEnthusiasm(commentContext)}
- Alternative solutions mentioned: ${this.extractAlternativeSolutions(commentContext)}

Consider this community feedback when scoring market validation and emotion level.`
  }

  /**
   * Calculate average enthusiasm from comment metadata
   */
  private calculateAverageEnthusiasm(comments: CommentAnalysisMetadata[]): string {
    const enthusiasmMap = { high: 3, medium: 2, low: 1 }
    const total = comments.reduce((sum, c) => sum + enthusiasmMap[c.enthusiasmLevel], 0)
    const average = total / comments.length
    
    if (average >= 2.5) return 'High'
    if (average >= 1.5) return 'Medium'
    return 'Low'
  }

  /**
   * Extract alternative solutions from comments
   */
  private extractAlternativeSolutions(comments: CommentAnalysisMetadata[]): string {
    const alternatives = comments
      .flatMap(c => c.validationSignals.alternativeSolutions || [])
      .filter((v, i, a) => a.indexOf(v) === i) // unique values
    
    return alternatives.length > 0 ? alternatives.join(', ') : 'None mentioned'
  }

  /**
   * Transform AI response to full dimensional analysis with metadata
   */
  private transformToAnalysis(
    aiResponse: AIDimensionalResponse,
    processingTime: number
  ): DimensionalAnalysis {
    // Calculate composite score from scored dimensions
    const compositeScore = this.calculateCompositeScore(aiResponse.scores)
    
    // Calculate overall confidence
    const confidenceScore = this.calculateOverallConfidence(aiResponse)

    return {
      // Classifications
      persona: {
        ...aiResponse.classifications.persona,
        feedback: []
      },
      industryVertical: {
        ...aiResponse.classifications.industryVertical,
        feedback: []
      },
      userRole: {
        ...aiResponse.classifications.userRole,
        feedback: []
      },
      workflowStage: {
        ...aiResponse.classifications.workflowStage,
        feedback: []
      },
      
      // Scores with weights
      emotionLevel: {
        ...aiResponse.scores.emotionLevel,
        weight: DEFAULT_DIMENSION_WEIGHTS.emotionLevel,
        feedback: []
      },
      marketSize: {
        ...aiResponse.scores.marketSize,
        weight: DEFAULT_DIMENSION_WEIGHTS.marketSize,
        feedback: []
      },
      technicalComplexity: {
        ...aiResponse.scores.technicalComplexity,
        weight: DEFAULT_DIMENSION_WEIGHTS.technicalComplexity,
        feedback: []
      },
      existingSolutions: {
        ...aiResponse.scores.existingSolutions,
        weight: DEFAULT_DIMENSION_WEIGHTS.existingSolutions,
        feedback: []
      },
      budgetContext: {
        ...aiResponse.scores.budgetContext,
        weight: DEFAULT_DIMENSION_WEIGHTS.budgetContext,
        feedback: []
      },
      timeSensitivity: {
        ...aiResponse.scores.timeSensitivity,
        weight: DEFAULT_DIMENSION_WEIGHTS.timeSensitivity,
        feedback: []
      },
      
      // Metadata
      compositeScore,
      confidenceScore,
      analysisVersion: '1.0.0',
      processingTime,
      createdAt: new Date()
    }
  }

  /**
   * Calculate weighted composite score (AC: 3)
   * Note: Technical complexity and existing solutions are inverted (lower is better)
   */
  private calculateCompositeScore(scores: AIDimensionalResponse['scores']): number {
    const weights = DEFAULT_DIMENSION_WEIGHTS
    
    // Invert technical complexity and existing solutions (lower is better)
    const invertedTechnicalComplexity = 11 - scores.technicalComplexity.score
    const invertedExistingSolutions = 11 - scores.existingSolutions.score
    
    const weightedSum = 
      (scores.emotionLevel.score * weights.emotionLevel) +
      (scores.marketSize.score * weights.marketSize) +
      (invertedTechnicalComplexity * weights.technicalComplexity) +
      (invertedExistingSolutions * weights.existingSolutions) +
      (scores.budgetContext.score * weights.budgetContext) +
      (scores.timeSensitivity.score * weights.timeSensitivity)
    
    // Scale from 1-10 range to 1-100
    return Math.round(weightedSum * 10)
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(aiResponse: AIDimensionalResponse): number {
    const allConfidences = [
      ...Object.values(aiResponse.classifications).map(c => c.confidence),
      ...Object.values(aiResponse.scores).map(s => s.confidence)
    ]
    
    const averageConfidence = allConfidences.reduce((sum, c) => sum + c, 0) / allConfidences.length
    return Math.round(averageConfidence * 100) / 100
  }

  /**
   * Validate analysis meets quality thresholds
   */
  private validateAnalysisQuality(analysis: DimensionalAnalysis): void {
    if (analysis.confidenceScore < QUALITY_THRESHOLDS.minConfidence) {
      AppLogger.warn('Dimensional analysis below confidence threshold', {
        service: 'dimensional-analysis',
        operation: 'validate_quality',
        metadata: {
          confidenceScore: analysis.confidenceScore,
          threshold: QUALITY_THRESHOLDS.minConfidence
        }
      })
    }

    if (analysis.processingTime > QUALITY_THRESHOLDS.maxProcessingTime) {
      AppLogger.warn('Dimensional analysis exceeded processing time limit', {
        service: 'dimensional-analysis',
        operation: 'validate_quality',
        metadata: {
          processingTime: analysis.processingTime,
          threshold: QUALITY_THRESHOLDS.maxProcessingTime
        }
      })
    }
  }

  /**
   * Create fallback analysis for error cases (AC: 9)
   */
  private createFallbackAnalysis(content: string, processingTime: number): DimensionalAnalysis {
    return {
      // Default classifications with low confidence
      persona: {
        value: 'unknown',
        confidence: 0.1,
        evidence: ['Unable to determine from content'],
        reasoning: 'Analysis failed, using fallback',
        feedback: []
      },
      industryVertical: {
        value: 'general',
        confidence: 0.1,
        evidence: ['Unable to determine from content'],
        reasoning: 'Analysis failed, using fallback',
        feedback: []
      },
      userRole: {
        value: 'unknown',
        confidence: 0.1,
        evidence: ['Unable to determine from content'],
        reasoning: 'Analysis failed, using fallback',
        feedback: []
      },
      workflowStage: {
        value: 'problem-identification',
        confidence: 0.1,
        evidence: ['Unable to determine from content'],
        reasoning: 'Analysis failed, using fallback',
        feedback: []
      },
      
      // Default scores with low confidence
      emotionLevel: {
        score: 5,
        confidence: 0.1,
        evidence: ['Unable to analyze'],
        reasoning: 'Using neutral fallback score',
        weight: DEFAULT_DIMENSION_WEIGHTS.emotionLevel,
        feedback: []
      },
      marketSize: {
        score: 5,
        confidence: 0.1,
        evidence: ['Unable to analyze'],
        reasoning: 'Using neutral fallback score',
        weight: DEFAULT_DIMENSION_WEIGHTS.marketSize,
        feedback: []
      },
      technicalComplexity: {
        score: 5,
        confidence: 0.1,
        evidence: ['Unable to analyze'],
        reasoning: 'Using neutral fallback score',
        weight: DEFAULT_DIMENSION_WEIGHTS.technicalComplexity,
        feedback: []
      },
      existingSolutions: {
        score: 5,
        confidence: 0.1,
        evidence: ['Unable to analyze'],
        reasoning: 'Using neutral fallback score',
        weight: DEFAULT_DIMENSION_WEIGHTS.existingSolutions,
        feedback: []
      },
      budgetContext: {
        score: 5,
        confidence: 0.1,
        evidence: ['Unable to analyze'],
        reasoning: 'Using neutral fallback score',
        weight: DEFAULT_DIMENSION_WEIGHTS.budgetContext,
        feedback: []
      },
      timeSensitivity: {
        score: 5,
        confidence: 0.1,
        evidence: ['Unable to analyze'],
        reasoning: 'Using neutral fallback score',
        weight: DEFAULT_DIMENSION_WEIGHTS.timeSensitivity,
        feedback: []
      },
      
      compositeScore: 50,
      confidenceScore: 0.1,
      analysisVersion: '1.0.0',
      processingTime,
      createdAt: new Date()
    }
  }

  /**
   * Track AI processing costs for dimensional analysis
   */
  private async trackDimensionalAnalysisCost(processingTimeMs: number): Promise<void> {
    if (!this.analysisId || !this.costTrackingService) return

    try {
      // Estimate token usage (approximately 2000 tokens for full dimensional analysis)
      const estimatedTokens = 2000
      const tokenCost = calculateEventCost('openai_tokens', estimatedTokens)

      await this.costTrackingService.recordCostEvent({
        analysisId: this.analysisId,
        eventType: 'openai_tokens',
        provider: 'openai',
        quantity: estimatedTokens,
        unitCost: tokenCost / estimatedTokens,
        totalCost: tokenCost,
        eventData: {
          service: 'dimensional-analysis',
          model: this.model,
          processingTimeMs,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      AppLogger.error('Failed to track dimensional analysis cost', {
        service: 'dimensional-analysis',
        operation: 'track_cost_error',
        metadata: {
          analysisId: this.analysisId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }
}