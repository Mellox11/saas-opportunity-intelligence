import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { RedditComment, CommentAnalysisMetadata, commentAnalysisMetadataSchema } from '@/lib/validation/reddit-schema'
import { AppLogger } from '@/lib/observability/logger'
import { CostTrackingService } from '@/lib/services/cost-tracking.service'
import { calculateEventCost } from '@/lib/utils/cost-calculator'

/**
 * Comment Analysis Service
 * AC: 2, 3, 7 - AI-powered comment sentiment analysis with validation signals and confidence scoring
 */
export class CommentAnalysisService {
  private costTrackingService: CostTrackingService | null

  constructor(private analysisId?: string, skipCostTracking: boolean = false) {
    this.costTrackingService = skipCostTracking ? null : new CostTrackingService()
  }

  /**
   * Analyze comment sentiment and extract validation signals
   * AC: 2 - AI processes comment threads using same classification pipeline as posts
   * AC: 3 - Comments provide validation signals: agreement, disagreement, alternative solutions mentioned
   * AC: 7 - Comment sentiment analysis identifies enthusiasm vs skepticism levels with confidence scores
   */
  async analyzeCommentSentiment(
    comment: RedditComment,
    originalPostContext?: string
  ): Promise<CommentAnalysisMetadata> {
    const startTime = Date.now()

    try {
      AppLogger.info('Starting comment sentiment analysis', {
        service: 'comment-analysis',
        operation: 'analyze_sentiment',
        metadata: {
          commentId: comment.redditId,
          postId: comment.postId,
          hasContext: !!originalPostContext
        }
      })

      const analysisResult = await generateObject({
        model: openai('gpt-4-turbo-preview'), // Use same model as main AI processing
        schema: z.object({
          sentimentScore: z.number().min(-1).max(1).describe('Overall sentiment from -1 (very negative) to 1 (very positive)'),
          confidenceScore: z.number().min(0).max(1).describe('Confidence in this analysis from 0 to 1'),
          validationSignals: z.object({
            agreement: z.boolean().describe('Does this comment agree with or validate the original problem/opportunity?'),
            disagreement: z.boolean().describe('Does this comment disagree with or contradict the original problem?'),
            alternativeSolutions: z.array(z.string()).describe('Any alternative solutions mentioned in the comment')
          }),
          enthusiasmLevel: z.enum(['high', 'medium', 'low']).describe('Level of enthusiasm or excitement expressed'),
          skepticismLevel: z.enum(['high', 'medium', 'low']).describe('Level of skepticism or doubt expressed')
        }),
        prompt: this.buildCommentAnalysisPrompt(comment, originalPostContext),
        temperature: 0.2 // Lower temperature for consistent analysis
      })

      const processingTime = Date.now() - startTime

      // Track AI processing cost
      await this.trackCommentAnalysisCost(comment, processingTime)

      const metadata: CommentAnalysisMetadata = {
        ...analysisResult.object,
        processedAt: new Date().toISOString(),
        aiModel: 'gpt-4-turbo-preview',
        processingTimeMs: processingTime
      }

      AppLogger.info('Comment sentiment analysis completed', {
        service: 'comment-analysis',
        operation: 'analyze_sentiment_completed',
        metadata: {
          commentId: comment.redditId,
          sentimentScore: metadata.sentimentScore,
          confidenceScore: metadata.confidenceScore,
          processingTimeMs: processingTime
        }
      })

      return metadata

    } catch (error) {
      const processingTime = Date.now() - startTime

      AppLogger.error('Comment sentiment analysis failed', {
        service: 'comment-analysis',
        operation: 'analyze_sentiment_error',
        metadata: {
          commentId: comment.redditId,
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTimeMs: processingTime
        }
      })

      // Return a fallback analysis with low confidence
      return {
        sentimentScore: 0,
        confidenceScore: 0.1,
        validationSignals: {
          agreement: false,
          disagreement: false,
          alternativeSolutions: []
        },
        enthusiasmLevel: 'low',
        skepticismLevel: 'medium',
        processedAt: new Date().toISOString(),
        aiModel: 'gpt-4-turbo-preview',
        processingTimeMs: processingTime
      }
    }
  }

  /**
   * Build comprehensive AI prompt for comment analysis
   */
  private buildCommentAnalysisPrompt(comment: RedditComment, originalPostContext?: string): string {
    const contextSection = originalPostContext 
      ? `\n\nORIGINAL POST CONTEXT:\n${originalPostContext}\n\n`
      : '\n\n'

    return `Analyze this Reddit comment for sentiment and validation signals:

COMMENT TO ANALYZE:
Author: ${comment.anonymizedAuthor || comment.author}
Content: "${comment.content}"
Score: ${comment.score} upvotes
${contextSection}

Please analyze the comment and provide:

1. SENTIMENT SCORE (-1 to 1):
   - -1: Very negative (angry, frustrated, critical)
   - 0: Neutral (factual, balanced)
   - +1: Very positive (excited, supportive, enthusiastic)

2. CONFIDENCE SCORE (0 to 1):
   - How confident are you in this sentiment analysis?
   - Consider comment length, clarity, and context

3. VALIDATION SIGNALS:
   - Agreement: Does the comment validate or support the original problem/idea?
   - Disagreement: Does the comment contradict or dismiss the problem/idea?
   - Alternative Solutions: Any specific solutions or tools mentioned?

4. ENTHUSIASM LEVEL (high/medium/low):
   - High: Excited language, multiple exclamation points, eager to help
   - Medium: Interested but measured response
   - Low: Minimal engagement or flat tone

5. SKEPTICISM LEVEL (high/medium/low):
   - High: Doubtful language, questioning feasibility, dismissive
   - Medium: Some concerns but open-minded
   - Low: Generally accepting or no skepticism expressed

Focus on the actual content and tone rather than the upvote score. Look for specific language patterns that indicate sentiment and validation.`
  }

  /**
   * Track AI processing costs for comment analysis
   */
  private async trackCommentAnalysisCost(comment: RedditComment, processingTimeMs: number): Promise<void> {
    if (!this.analysisId || !this.costTrackingService) return

    try {
      // Estimate token usage (approximately 500 tokens per comment analysis)
      const estimatedTokens = 500
      const tokenCost = calculateEventCost('openai_tokens', estimatedTokens)

      await this.costTrackingService.recordCostEvent({
        analysisId: this.analysisId,
        eventType: 'openai_tokens',
        provider: 'openai',
        quantity: estimatedTokens,
        unitCost: tokenCost / estimatedTokens,
        totalCost: tokenCost,
        eventData: {
          commentId: comment.redditId,
          postId: comment.postId,
          model: 'gpt-4-turbo-preview',
          processingTimeMs,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      AppLogger.error('Failed to track comment analysis cost', {
        service: 'comment-analysis',
        operation: 'track_cost_error',
        metadata: {
          commentId: comment.redditId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * Batch analyze multiple comments for efficiency
   * AC: 2 - Process comment threads efficiently
   */
  async batchAnalyzeComments(
    comments: RedditComment[],
    originalPostContext?: string,
    batchSize: number = 5
  ): Promise<Map<string, CommentAnalysisMetadata>> {
    const results = new Map<string, CommentAnalysisMetadata>()
    
    AppLogger.info('Starting batch comment analysis', {
      service: 'comment-analysis',
      operation: 'batch_analyze',
      metadata: {
        totalComments: comments.length,
        batchSize
      }
    })

    // Process comments in batches to avoid overwhelming the API
    for (let i = 0; i < comments.length; i += batchSize) {
      const batch = comments.slice(i, i + batchSize)
      
      // Process batch concurrently
      const batchPromises = batch.map(async (comment) => {
        try {
          const analysis = await this.analyzeCommentSentiment(comment, originalPostContext)
          return { commentId: comment.redditId, analysis }
        } catch (error) {
          AppLogger.error('Failed to analyze comment in batch', {
            service: 'comment-analysis',
            operation: 'batch_analyze_single_error',
            metadata: {
              commentId: comment.redditId,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          })
          return null
        }
      })

      const batchResults = await Promise.all(batchPromises)
      
      // Collect successful results
      for (const result of batchResults) {
        if (result) {
          results.set(result.commentId, result.analysis)
        }
      }

      // Rate limiting: small delay between batches
      if (i + batchSize < comments.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    AppLogger.info('Batch comment analysis completed', {
      service: 'comment-analysis',
      operation: 'batch_analyze_completed',
      metadata: {
        totalComments: comments.length,
        successfulAnalyses: results.size,
        failedAnalyses: comments.length - results.size
      }
    })

    return results
  }

  /**
   * Validate analysis metadata against schema
   */
  validateAnalysisMetadata(metadata: any): CommentAnalysisMetadata | null {
    try {
      return commentAnalysisMetadataSchema.parse(metadata)
    } catch (error) {
      AppLogger.error('Invalid comment analysis metadata', {
        service: 'comment-analysis',
        operation: 'validate_metadata_error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          invalidData: metadata
        }
      })
      return null
    }
  }
}