import { openai } from '@ai-sdk/openai'
import { generateObject, generateText } from 'ai'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { CostTrackingService } from '@/lib/services/cost-tracking.service'
import { calculateEventCost } from '@/lib/utils/cost-calculator'

// Schema for AI classification results
const opportunityClassificationSchema = z.object({
  isSaasFeasible: z.boolean(),
  confidence: z.number().min(0).max(1),
  urgencyScore: z.number().min(0).max(100),
  marketSignalsScore: z.number().min(0).max(100),
  feasibilityScore: z.number().min(0).max(100),
  problemStatement: z.string(),
  evidence: z.array(z.string()),
  antiPatterns: z.array(z.string()).optional(),
  reasoning: z.string()
})

export type OpportunityClassification = z.infer<typeof opportunityClassificationSchema>

export class AIProcessingService {
  private costTrackingService: CostTrackingService
  private model = 'gpt-4-turbo-preview' // Using GPT-4 for better classification

  constructor(private analysisId: string) {
    this.costTrackingService = new CostTrackingService()
  }

  /**
   * Process a batch of Reddit posts for SaaS opportunities
   */
  async processPosts(posts: any[], batchSize: number = 10): Promise<void> {
    const batches = this.createBatches(posts, batchSize)
    let processedCount = 0
    
    try {
      // Update analysis progress
      await prisma.analysis.update({
        where: { id: this.analysisId },
        data: {
          progress: JSON.stringify({
            stage: 'ai_processing',
            message: 'Analyzing posts for SaaS opportunities...',
            percentage: 60,
            totalPosts: posts.length,
            processedPosts: 0
          })
        }
      })

      for (const batch of batches) {
        const opportunities = await this.processBatch(batch)
        
        // Store opportunities in database
        await this.storeOpportunities(opportunities, batch)
        
        processedCount += batch.length
        
        // Update progress
        const percentage = 60 + Math.floor((processedCount / posts.length) * 30)
        await prisma.analysis.update({
          where: { id: this.analysisId },
          data: {
            progress: JSON.stringify({
              stage: 'ai_processing',
              message: `Processed ${processedCount}/${posts.length} posts...`,
              percentage,
              totalPosts: posts.length,
              processedPosts: processedCount
            })
          }
        })
      }

      // Mark posts as processed
      const postIds = posts.map(p => p.id)
      await prisma.redditPost.updateMany({
        where: {
          id: { in: postIds },
          analysisId: this.analysisId
        },
        data: {
          processed: true
        }
      })

    } catch (error) {
      console.error('AI processing error:', error)
      throw error
    }
  }

  /**
   * Process a batch of posts
   */
  private async processBatch(posts: any[]): Promise<OpportunityClassification[]> {
    const opportunities: OpportunityClassification[] = []
    
    for (const post of posts) {
      try {
        const classification = await this.classifyPost(post)
        
        // Only include posts with 70+ opportunity score
        const opportunityScore = this.calculateOpportunityScore(classification)
        if (classification.isSaasFeasible && opportunityScore >= 70) {
          opportunities.push(classification)
        }
        
        // Track AI costs
        await this.trackAICosts(post.title.length + (post.content?.length || 0))
        
      } catch (error) {
        console.error(`Failed to classify post ${post.id}:`, error)
        // Continue with next post on error
      }
    }
    
    return opportunities
  }

  /**
   * Classify a single Reddit post for SaaS feasibility
   */
  private async classifyPost(post: any): Promise<OpportunityClassification> {
    const prompt = this.buildClassificationPrompt(post)
    
    try {
      const { object } = await generateObject({
        model: openai(this.model),
        schema: opportunityClassificationSchema,
        prompt,
        temperature: 0.3, // Lower temperature for more consistent classification
        maxTokens: 1000
      })
      
      return object
    } catch (error) {
      console.error('OpenAI API error:', error)
      // Return non-feasible classification on error
      return {
        isSaasFeasible: false,
        confidence: 0,
        urgencyScore: 0,
        marketSignalsScore: 0,
        feasibilityScore: 0,
        problemStatement: '',
        evidence: [],
        antiPatterns: [],
        reasoning: 'Classification failed'
      }
    }
  }

  /**
   * Build the classification prompt
   */
  private buildClassificationPrompt(post: any): string {
    const content = post.content || 'No content'
    const comments = post.comments?.slice(0, 5).map((c: any) => 
      `- ${c.content} (score: ${c.score})`
    ).join('\n') || 'No comments'
    
    return `Analyze this Reddit post for SaaS opportunity potential. Focus on identifying real problems that could be solved with software.

Reddit Post:
Title: ${post.title}
Subreddit: r/${post.subreddit}
Score: ${post.score}
Comments: ${post.numComments}

Content:
${content}

Top Comments:
${comments}

Evaluate the following:
1. Is this describing a real problem that could be solved with a SaaS product?
2. How urgent is the problem (0-100)?
3. What market signals indicate demand (0-100)?
4. How feasible is it to build a solution (0-100)?
5. What is the core problem statement?
6. What evidence supports this being a good opportunity?
7. What anti-patterns or red flags exist?

Consider factors like:
- Problem frequency and pain level
- Willingness to pay for a solution
- Market size potential
- Technical feasibility
- Competition landscape
- Clear use case definition`
  }

  /**
   * Calculate overall opportunity score
   */
  private calculateOpportunityScore(classification: OpportunityClassification): number {
    const weights = {
      urgency: 0.35,
      marketSignals: 0.35,
      feasibility: 0.3
    }
    
    const score = 
      classification.urgencyScore * weights.urgency +
      classification.marketSignalsScore * weights.marketSignals +
      classification.feasibilityScore * weights.feasibility
    
    // Apply confidence modifier
    return Math.round(score * classification.confidence)
  }

  /**
   * Store opportunities in database with batch insert for better performance
   */
  private async storeOpportunities(
    opportunities: OpportunityClassification[],
    posts: any[]
  ): Promise<void> {
    if (opportunities.length === 0) return

    const opportunityData = opportunities.map((opp, i) => {
      const post = posts.find(p => p.id === posts[i]?.id) || posts[i]
      const opportunityScore = this.calculateOpportunityScore(opp)
      
      return {
        analysisId: this.analysisId,
        sourcePostId: post.id,
        title: post.title.substring(0, 200), // Limit title length
        problemStatement: opp.problemStatement.substring(0, 1000), // Prevent oversized statements
        opportunityScore,
        confidenceScore: opp.confidence,
        urgencyScore: opp.urgencyScore,
        marketSignalsScore: opp.marketSignalsScore,
        feasibilityScore: opp.feasibilityScore,
        classification: opp.isSaasFeasible ? 'saas_feasible' : 'not_feasible',
        evidence: JSON.stringify(opp.evidence),
        antiPatterns: opp.antiPatterns ? JSON.stringify(opp.antiPatterns) : null,
        metadata: JSON.stringify({
          reasoning: opp.reasoning.substring(0, 500), // Limit reasoning length
          postScore: post.score,
          postComments: post.numComments,
          subreddit: post.subreddit,
          classificationTimestamp: new Date().toISOString()
        })
      }
    })

    // Batch insert for better performance
    await prisma.opportunity.createMany({
      data: opportunityData,
      skipDuplicates: true
    })
  }

  /**
   * Track AI processing costs
   */
  private async trackAICosts(tokenEstimate: number): Promise<void> {
    try {
      // Rough estimation: 1 token per 4 characters
      const tokens = Math.ceil(tokenEstimate / 4)
      
      await this.costTrackingService.recordCostEvent({
        analysisId: this.analysisId,
        eventType: 'openai_tokens',
        provider: 'openai',
        quantity: tokens,
        unitCost: 0.00003, // GPT-4 pricing per token
        totalCost: calculateEventCost('openai_tokens', tokens),
        eventData: {
          model: this.model,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Failed to track AI costs:', error)
    }
  }

  /**
   * Create batches from posts array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * Get top opportunities from analysis
   */
  async getTopOpportunities(limit: number = 10): Promise<any[]> {
    return await prisma.opportunity.findMany({
      where: {
        analysisId: this.analysisId,
        opportunityScore: {
          gte: 70
        }
      },
      orderBy: {
        opportunityScore: 'desc'
      },
      take: limit,
      include: {
        sourcePost: true
      }
    })
  }
}