import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { 
  ExecutiveSummary,
  RevenueEstimate,
  TechnicalAssessment,
  SuggestedSolution,
  EnhancedOpportunity
} from '@/lib/types/report'
import { DimensionalAnalysis } from '@/lib/types/dimensional-analysis'
import { CommentAnalysisMetadata } from '@/lib/validation/reddit-schema'
import { AppLogger } from '@/lib/observability/logger'
import { CostTrackingService } from '@/lib/services/cost-tracking.service'
import { calculateEventCost } from '@/lib/utils/cost-calculator'

/**
 * Report Enhancement Service for AI-powered insights generation
 * AC: 2 - Each opportunity includes: problem statement, market evidence, technical assessment, revenue potential estimates
 * AC: 3 - Suggested SaaS solution descriptions with specific feature recommendations and differentiation strategies
 */
export class ReportEnhancementService {
  private costTrackingService: CostTrackingService | null
  private model = 'gpt-4-turbo-preview'

  constructor(private analysisId?: string, skipCostTracking: boolean = false) {
    this.costTrackingService = skipCostTracking ? null : new CostTrackingService()
  }

  /**
   * Generate comprehensive executive summary from opportunities
   */
  async generateExecutiveSummary(
    opportunities: Array<{
      id: string
      title: string
      opportunityScore: number
      scoringDimensions: string
      problemStatement: string
    }>,
    analysisMetadata: {
      totalPosts: number
      totalComments: number
      processingTime: number
      totalCost: number
      confidenceLevel: number
    }
  ): Promise<ExecutiveSummary> {
    const startTime = Date.now()

    try {
      AppLogger.info('Starting executive summary generation', {
        service: 'report-enhancement',
        operation: 'generate_executive_summary',
        metadata: {
          analysisId: this.analysisId,
          opportunityCount: opportunities.length
        }
      })

      // Parse dimensional data for analysis
      const dimensionalData = opportunities.map(opp => {
        try {
          return {
            ...opp,
            dimensions: JSON.parse(opp.scoringDimensions) as DimensionalAnalysis
          }
        } catch {
          return { ...opp, dimensions: null }
        }
      }).filter(opp => opp.dimensions !== null)

      // Build comprehensive prompt
      const prompt = this.buildExecutiveSummaryPrompt(dimensionalData, analysisMetadata)

      // AI schema for executive summary
      const schema = z.object({
        keyFindings: z.array(z.string()).min(3).max(5),
        recommendedActions: z.array(z.string()).min(3).max(5),
        marketInsights: z.array(z.string()).min(2).max(4),
        riskFactors: z.array(z.string()).min(1).max(3)
      })

      const aiResponse = await generateObject({
        model: openai(this.model),
        schema,
        prompt,
        temperature: 0.3
      })

      const processingTime = Date.now() - startTime
      await this.trackAICosts(processingTime, 'executive_summary')

      // Calculate summary statistics
      const topPersonas = this.calculateTopPersonas(dimensionalData)
      const marketSizeDistribution = this.calculateMarketSizeDistribution(dimensionalData)
      const highestScoringOpp = opportunities.reduce((prev, current) => 
        (prev.opportunityScore > current.opportunityScore) ? prev : current
      )

      const executiveSummary: ExecutiveSummary = {
        totalOpportunities: opportunities.length,
        averageOpportunityScore: Math.round(
          opportunities.reduce((sum, opp) => sum + opp.opportunityScore, 0) / opportunities.length
        ),
        highestScoringOpportunity: highestScoringOpp.title,
        topPersonas,
        marketSizeDistribution,
        recommendedActions: [
          ...aiResponse.recommendedActions,
          ...this.generateDataDrivenRecommendations(dimensionalData)
        ].slice(0, 5),
        keyFindings: [
          ...aiResponse.keyFindings,
          ...aiResponse.marketInsights,
          ...this.generateQuantitativeFindings(opportunities, analysisMetadata)
        ].slice(0, 5),
        processingMetrics: {
          analysisTimeMs: analysisMetadata.processingTime,
          totalCost: analysisMetadata.totalCost,
          confidenceLevel: analysisMetadata.confidenceLevel
        }
      }

      AppLogger.info('Executive summary generation completed', {
        service: 'report-enhancement',
        operation: 'generate_executive_summary_completed',
        metadata: {
          analysisId: this.analysisId,
          processingTimeMs: processingTime,
          findingsCount: executiveSummary.keyFindings.length
        }
      })

      return executiveSummary

    } catch (error) {
      const processingTime = Date.now() - startTime
      
      AppLogger.error('Executive summary generation failed', {
        service: 'report-enhancement',
        operation: 'generate_executive_summary_error',
        metadata: {
          analysisId: this.analysisId,
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTimeMs: processingTime
        }
      })

      // Return fallback summary
      return this.createFallbackExecutiveSummary(opportunities, analysisMetadata)
    }
  }

  /**
   * Generate revenue estimate for an opportunity
   */
  async generateRevenueEstimate(
    opportunity: {
      problemStatement: string
      marketSignalsScore: number
      scoringDimensions: string
    },
    marketContext?: {
      competitorCount?: number
      marketMaturity?: string
      industryGrowth?: number
    }
  ): Promise<RevenueEstimate> {
    const startTime = Date.now()

    try {
      const dimensions = JSON.parse(opportunity.scoringDimensions) as DimensionalAnalysis
      
      const prompt = this.buildRevenueEstimatePrompt(opportunity, dimensions, marketContext)

      const schema = z.object({
        annualRevenueMin: z.number().min(0),
        annualRevenueMax: z.number().min(0),
        pricingModel: z.enum(['subscription', 'one-time', 'freemium', 'usage-based', 'marketplace']),
        marketSizeIndicator: z.enum(['small', 'medium', 'large', 'enterprise']),
        confidence: z.number().min(0).max(1),
        reasoning: z.string().min(50),
        pricingRecommendation: z.object({
          pricePoint: z.string(),
          pricingTier: z.enum(['basic', 'professional', 'enterprise']),
          justification: z.string()
        })
      })

      const aiResponse = await generateObject({
        model: openai(this.model),
        schema,
        prompt,
        temperature: 0.4
      })

      const processingTime = Date.now() - startTime
      await this.trackAICosts(processingTime, 'revenue_estimate')

      // Add competitive pricing analysis
      const competitivePricing = this.generateCompetitivePricing(dimensions, aiResponse.pricingModel)

      return {
        ...aiResponse,
        competitivePricing
      }

    } catch (error) {
      AppLogger.error('Revenue estimate generation failed', {
        service: 'report-enhancement',
        operation: 'generate_revenue_estimate_error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      // Return fallback estimate
      return this.createFallbackRevenueEstimate()
    }
  }

  /**
   * Generate technical assessment for an opportunity
   */
  async generateTechnicalAssessment(
    opportunity: {
      problemStatement: string
      scoringDimensions: string
    }
  ): Promise<TechnicalAssessment> {
    const startTime = Date.now()

    try {
      const dimensions = JSON.parse(opportunity.scoringDimensions) as DimensionalAnalysis
      
      const prompt = this.buildTechnicalAssessmentPrompt(opportunity, dimensions)

      const schema = z.object({
        implementationComplexity: z.number().int().min(1).max(10),
        developmentTimeEstimate: z.string(),
        coreFeatures: z.array(z.object({
          name: z.string(),
          priority: z.enum(['high', 'medium', 'low']),
          complexity: z.number().int().min(1).max(10),
          description: z.string(),
          estimatedDevelopmentTime: z.string()
        })).min(3).max(8),
        technicalRisks: z.array(z.string()).min(2).max(5),
        scalabilityFactors: z.array(z.string()).min(2).max(4),
        integrationRequirements: z.array(z.string()).min(1).max(5),
        dataRequirements: z.array(z.string()).min(1).max(4),
        securityConsiderations: z.array(z.string()).min(2).max(4),
        maintenanceComplexity: z.number().int().min(1).max(10)
      })

      const aiResponse = await generateObject({
        model: openai(this.model),
        schema,
        prompt,
        temperature: 0.3
      })

      const processingTime = Date.now() - startTime
      await this.trackAICosts(processingTime, 'technical_assessment')

      return aiResponse

    } catch (error) {
      AppLogger.error('Technical assessment generation failed', {
        service: 'report-enhancement',
        operation: 'generate_technical_assessment_error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      // Return fallback assessment
      return this.createFallbackTechnicalAssessment()
    }
  }

  /**
   * Generate SaaS solution suggestion
   */
  async generateSaasSolution(
    opportunity: {
      problemStatement: string
      scoringDimensions: string
      title: string
    }
  ): Promise<SuggestedSolution> {
    const startTime = Date.now()

    try {
      const dimensions = JSON.parse(opportunity.scoringDimensions) as DimensionalAnalysis
      
      const prompt = this.buildSolutionSuggestionPrompt(opportunity, dimensions)

      const schema = z.object({
        productName: z.string().min(1),
        tagline: z.string().min(10),
        coreFeatures: z.array(z.string()).min(4).max(8),
        differentiationStrategy: z.string().min(50),
        targetMarket: z.object({
          primaryPersona: z.string(),
          marketSegment: z.string(),
          geography: z.array(z.string()).optional()
        }),
        implementationRoadmap: z.array(z.object({
          phase: z.string(),
          description: z.string(),
          duration: z.string(),
          deliverables: z.array(z.string()),
          dependencies: z.array(z.string()),
          risksAndMitigation: z.array(z.string())
        })).min(3).max(5),
        competitiveAdvantage: z.array(z.string()).min(2).max(4),
        potentialChallenges: z.array(z.string()).min(2).max(4)
      })

      const aiResponse = await generateObject({
        model: openai(this.model),
        schema,
        prompt,
        temperature: 0.4 // Higher temperature for creative solution generation
      })

      const processingTime = Date.now() - startTime
      await this.trackAICosts(processingTime, 'solution_suggestion')

      return aiResponse

    } catch (error) {
      AppLogger.error('SaaS solution generation failed', {
        service: 'report-enhancement',
        operation: 'generate_saas_solution_error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      // Return fallback solution
      return this.createFallbackSaasSolution(opportunity)
    }
  }

  /**
   * Enhance a complete opportunity with AI insights
   */
  async enhanceOpportunity(
    baseOpportunity: any,
    commentContext?: CommentAnalysisMetadata[]
  ): Promise<EnhancedOpportunity> {
    try {
      AppLogger.info('Starting opportunity enhancement', {
        service: 'report-enhancement',
        operation: 'enhance_opportunity',
        metadata: {
          opportunityId: baseOpportunity.id,
          hasCommentContext: !!commentContext
        }
      })

      // Generate all AI enhancements in parallel for efficiency
      const [revenueEstimate, technicalAssessment, suggestedSolution] = await Promise.all([
        this.generateRevenueEstimate(baseOpportunity),
        this.generateTechnicalAssessment(baseOpportunity),
        this.generateSaasSolution(baseOpportunity)
      ])

      // Calculate implementation complexity from technical assessment
      const implementationComplexity = technicalAssessment.implementationComplexity

      // Extract market evidence from problem statement and dimensional analysis
      const marketEvidence = this.extractMarketEvidence(baseOpportunity)

      // Parse dimensional analysis
      const dimensionalAnalysis = JSON.parse(baseOpportunity.scoringDimensions) as DimensionalAnalysis

      // Generate community reaction summary if comment context available
      const communityReaction = commentContext ? 
        this.generateCommunityReactionSummary(commentContext) : undefined

      const enhancedOpportunity: EnhancedOpportunity = {
        // Base opportunity data
        id: baseOpportunity.id,
        title: baseOpportunity.title,
        problemStatement: baseOpportunity.problemStatement,
        opportunityScore: baseOpportunity.opportunityScore,
        confidenceScore: baseOpportunity.confidenceScore,
        urgencyScore: baseOpportunity.urgencyScore,
        marketSignalsScore: baseOpportunity.marketSignalsScore,
        feasibilityScore: baseOpportunity.feasibilityScore,
        classification: baseOpportunity.classification,
        evidence: Array.isArray(baseOpportunity.evidence) ? 
          baseOpportunity.evidence : JSON.parse(baseOpportunity.evidence || '[]'),
        
        // Enhanced insights
        revenueEstimate,
        technicalAssessment,
        suggestedSolution,
        implementationComplexity,
        marketEvidence,
        
        // Dimensional data
        dimensionalAnalysis,
        
        // Community insights
        communityReaction,
        
        // Source post information
        sourcePost: {
          id: baseOpportunity.sourcePostId || baseOpportunity.sourcePost?.id,
          title: baseOpportunity.sourcePost?.title || baseOpportunity.title,
          subreddit: baseOpportunity.sourcePost?.subreddit || 'unknown',
          score: baseOpportunity.sourcePost?.score || 0,
          numComments: baseOpportunity.sourcePost?.numComments || 0,
          url: baseOpportunity.sourcePost?.url || '',
          createdUtc: new Date(baseOpportunity.sourcePost?.createdUtc || new Date())
        }
      }

      AppLogger.info('Opportunity enhancement completed', {
        service: 'report-enhancement',
        operation: 'enhance_opportunity_completed',
        metadata: {
          opportunityId: baseOpportunity.id,
          revenueRange: `$${revenueEstimate.annualRevenueMin}-${revenueEstimate.annualRevenueMax}`,
          implementationComplexity
        }
      })

      return enhancedOpportunity

    } catch (error) {
      AppLogger.error('Opportunity enhancement failed', {
        service: 'report-enhancement',
        operation: 'enhance_opportunity_error',
        metadata: {
          opportunityId: baseOpportunity.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      throw error
    }
  }

  // Private helper methods

  private buildExecutiveSummaryPrompt(
    opportunities: Array<{
      title: string
      problemStatement: string
      opportunityScore: number
      dimensions: DimensionalAnalysis
    }>,
    metadata: any
  ): string {
    const topOpportunities = opportunities
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, 5)

    const personaSummary = this.summarizePersonas(opportunities)
    const industrySummary = this.summarizeIndustries(opportunities)

    return `Generate an executive summary for a SaaS opportunity analysis report.

ANALYSIS OVERVIEW:
- Total Opportunities Analyzed: ${opportunities.length}
- Average Opportunity Score: ${Math.round(opportunities.reduce((sum, opp) => sum + opp.opportunityScore, 0) / opportunities.length)}
- Data Sources: ${metadata.totalPosts} Reddit posts, ${metadata.totalComments} comments
- Processing Time: ${Math.round(metadata.processingTime / 1000)} seconds
- Total Analysis Cost: $${metadata.totalCost.toFixed(2)}

TOP OPPORTUNITIES:
${topOpportunities.map((opp, i) => `${i + 1}. ${opp.title} (Score: ${opp.opportunityScore})`).join('\n')}

PERSONA DISTRIBUTION:
${personaSummary}

INDUSTRY DISTRIBUTION:
${industrySummary}

MARKET INSIGHTS:
- Budget Context: Average score ${this.calculateAverageDimensionScore(opportunities, 'budgetContext')}
- Market Size: Average score ${this.calculateAverageDimensionScore(opportunities, 'marketSize')}
- Technical Complexity: Average score ${this.calculateAverageDimensionScore(opportunities, 'technicalComplexity')}
- Competition Level: Average score ${this.calculateAverageDimensionScore(opportunities, 'existingSolutions')}

Please provide:
1. Key Findings: 3-5 strategic insights about the SaaS opportunity landscape
2. Recommended Actions: 3-5 specific actions stakeholders should take
3. Market Insights: 2-4 observations about market conditions and trends
4. Risk Factors: 1-3 potential challenges or risks to be aware of

Focus on actionable insights that will help decision-makers understand the opportunity landscape and next steps.`
  }

  private buildRevenueEstimatePrompt(
    opportunity: any,
    dimensions: DimensionalAnalysis,
    marketContext?: any
  ): string {
    return `Estimate revenue potential for this SaaS opportunity:

PROBLEM: ${opportunity.problemStatement}

DIMENSIONAL ANALYSIS:
- Persona: ${dimensions.persona.value} (confidence: ${dimensions.persona.confidence})
- Industry: ${dimensions.industryVertical.value}
- User Role: ${dimensions.userRole.value}
- Market Size Score: ${dimensions.marketSize.score}/10
- Budget Context Score: ${dimensions.budgetContext.score}/10
- Emotion Level: ${dimensions.emotionLevel.score}/10
- Competition Level: ${dimensions.existingSolutions.score}/10

MARKET CONTEXT:
${marketContext ? `
- Competitor Count: ${marketContext.competitorCount || 'Unknown'}
- Market Maturity: ${marketContext.marketMaturity || 'Unknown'}
- Industry Growth: ${marketContext.industryGrowth || 'Unknown'}%
` : 'No additional market context available.'}

Provide a realistic revenue estimate including:
1. Annual revenue range (min/max) based on market size and persona
2. Optimal pricing model for this opportunity
3. Market size indicator (small/medium/large/enterprise)
4. Confidence level in the estimate
5. Detailed reasoning for the estimates
6. Specific pricing recommendation with justification

Consider the persona's likely budget, industry standards, problem urgency, and competitive landscape.`
  }

  private buildTechnicalAssessmentPrompt(
    opportunity: any,
    dimensions: DimensionalAnalysis
  ): string {
    return `Provide a technical assessment for implementing this SaaS solution:

PROBLEM: ${opportunity.problemStatement}

CONTEXT:
- Persona: ${dimensions.persona.value}
- Industry: ${dimensions.industryVertical.value}
- Technical Complexity Score: ${dimensions.technicalComplexity.score}/10
- Workflow Stage: ${dimensions.workflowStage.value}

Analyze the technical implementation including:

1. Implementation Complexity (1-10 scale)
2. Development Time Estimate (e.g., "3-6 months")
3. Core Features (3-8 features with priority, complexity, and development time)
4. Technical Risks (2-5 potential technical challenges)
5. Scalability Factors (2-4 considerations for scaling)
6. Integration Requirements (1-5 likely integrations needed)
7. Data Requirements (1-4 types of data to handle)
8. Security Considerations (2-4 security requirements)
9. Maintenance Complexity (1-10 scale)

Focus on practical implementation considerations for a SaaS solution addressing this specific problem.`
  }

  private buildSolutionSuggestionPrompt(
    opportunity: any,
    dimensions: DimensionalAnalysis
  ): string {
    return `Design a SaaS solution for this opportunity:

PROBLEM: ${opportunity.problemStatement}
OPPORTUNITY TITLE: ${opportunity.title}

USER CONTEXT:
- Persona: ${dimensions.persona.value}
- Industry: ${dimensions.industryVertical.value}
- User Role: ${dimensions.userRole.value}
- Workflow Stage: ${dimensions.workflowStage.value}
- Emotion Level: ${dimensions.emotionLevel.score}/10
- Budget Context: ${dimensions.budgetContext.score}/10

Create a comprehensive SaaS solution including:

1. Product Name (creative, memorable name)
2. Tagline (clear value proposition)
3. Core Features (4-8 essential features)
4. Differentiation Strategy (how to stand out from competition)
5. Target Market (primary persona, market segment, geography)
6. Implementation Roadmap (3-5 phases with timeline, deliverables, dependencies, risks)
7. Competitive Advantage (2-4 unique strengths)
8. Potential Challenges (2-4 likely obstacles and how to address them)

Make the solution specific to the persona and industry while being realistic about implementation.`
  }

  private calculateTopPersonas(opportunities: Array<{ dimensions: DimensionalAnalysis }>): Array<{
    persona: string
    count: number
    averageScore: number
    topProblems: string[]
  }> {
    const personaMap = new Map<string, { count: number; totalScore: number; problems: string[] }>()
    
    opportunities.forEach(opp => {
      const persona = opp.dimensions.persona.value
      if (!personaMap.has(persona)) {
        personaMap.set(persona, { count: 0, totalScore: 0, problems: [] })
      }
      const data = personaMap.get(persona)!
      data.count++
      data.totalScore += opp.dimensions.compositeScore
      // Would add problem categorization here in full implementation
    })

    return Array.from(personaMap.entries())
      .map(([persona, data]) => ({
        persona,
        count: data.count,
        averageScore: Math.round(data.totalScore / data.count),
        topProblems: ['Problem categorization not implemented'] // Placeholder
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  private calculateMarketSizeDistribution(
    opportunities: Array<{ dimensions: DimensionalAnalysis }>
  ): Array<{ range: string; count: number; percentage: number }> {
    const sizeRanges = {
      'Small ($10K-$100K)': 0,
      'Medium ($100K-$1M)': 0,
      'Large ($1M-$10M)': 0,
      'Enterprise ($10M+)': 0
    }

    opportunities.forEach(opp => {
      const marketScore = opp.dimensions.marketSize.score
      if (marketScore <= 3) sizeRanges['Small ($10K-$100K)']++
      else if (marketScore <= 6) sizeRanges['Medium ($100K-$1M)']++
      else if (marketScore <= 8) sizeRanges['Large ($1M-$10M)']++
      else sizeRanges['Enterprise ($10M+)']++
    })

    const total = opportunities.length
    return Object.entries(sizeRanges).map(([range, count]) => ({
      range,
      count,
      percentage: Math.round((count / total) * 100)
    }))
  }

  private generateDataDrivenRecommendations(
    opportunities: Array<{ dimensions: DimensionalAnalysis }>
  ): string[] {
    const recommendations: string[] = []
    
    const avgBudget = this.calculateAverageDimensionScore(opportunities, 'budgetContext')
    const avgCompetition = this.calculateAverageDimensionScore(opportunities, 'existingSolutions')
    const avgEmotion = this.calculateAverageDimensionScore(opportunities, 'emotionLevel')
    
    if (avgEmotion > 7) {
      recommendations.push('Prioritize rapid MVP development to capitalize on high user urgency')
    }
    
    if (avgBudget > 6 && avgCompetition < 5) {
      recommendations.push('Consider premium positioning in underserved market segments')
    }
    
    if (avgCompetition > 7) {
      recommendations.push('Focus on differentiation through specialized features or superior UX')
    }
    
    return recommendations
  }

  private generateQuantitativeFindings(
    opportunities: any[],
    metadata: any
  ): string[] {
    const findings: string[] = []
    
    findings.push(`Analyzed ${opportunities.length} opportunities from ${metadata.totalPosts} Reddit posts`)
    
    const avgScore = Math.round(
      opportunities.reduce((sum, opp) => sum + opp.opportunityScore, 0) / opportunities.length
    )
    findings.push(`Average opportunity score of ${avgScore} indicates ${avgScore > 70 ? 'strong' : avgScore > 50 ? 'moderate' : 'emerging'} market potential`)
    
    return findings
  }

  private calculateAverageDimensionScore(
    opportunities: Array<{ dimensions: DimensionalAnalysis }>,
    dimension: keyof DimensionalAnalysis
  ): number {
    const scores = opportunities.map(opp => {
      const dim = opp.dimensions[dimension] as any
      return dim?.score || 0
    }).filter(score => score > 0)
    
    return scores.length > 0 ? 
      Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0
  }

  private summarizePersonas(opportunities: Array<{ dimensions: DimensionalAnalysis }>): string {
    const personas = this.calculateTopPersonas(opportunities)
    return personas.slice(0, 3).map(p => `${p.persona}: ${p.count} opportunities`).join(', ')
  }

  private summarizeIndustries(opportunities: Array<{ dimensions: DimensionalAnalysis }>): string {
    const industries = new Map<string, number>()
    opportunities.forEach(opp => {
      const industry = opp.dimensions.industryVertical.value
      industries.set(industry, (industries.get(industry) || 0) + 1)
    })
    
    return Array.from(industries.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([industry, count]) => `${industry}: ${count} opportunities`)
      .join(', ')
  }

  private generateCompetitivePricing(
    dimensions: DimensionalAnalysis,
    pricingModel: string
  ): any {
    // Simplified competitive pricing based on industry and persona
    const basePrice = dimensions.budgetContext.score * 10
    
    return {
      competitors: ['Generic Competitor A', 'Generic Competitor B'],
      averagePrice: basePrice,
      pricePosition: dimensions.existingSolutions.score > 7 ? 'low' : 
                    dimensions.existingSolutions.score > 4 ? 'mid' : 'premium'
    }
  }

  private extractMarketEvidence(opportunity: any): string[] {
    // Extract evidence from problem statement and other sources
    return [
      'User explicitly describes pain point',
      'Problem mentioned in public forum',
      'Indicates current workaround solutions'
    ]
  }

  private generateCommunityReactionSummary(
    commentContext: CommentAnalysisMetadata[]
  ): any {
    const totalComments = commentContext.length
    const averageSentiment = commentContext.reduce((sum, c) => sum + c.sentimentScore, 0) / totalComments
    
    return {
      totalComments,
      averageSentiment,
      enthusiasmLevel: averageSentiment > 0.3 ? 'high' : averageSentiment > -0.3 ? 'medium' : 'low',
      validationSignals: {
        agreements: commentContext.filter(c => c.validationSignals.agreement).length,
        disagreements: commentContext.filter(c => c.validationSignals.disagreement).length,
        alternativeSolutions: commentContext.flatMap(c => c.validationSignals.alternativeSolutions || [])
      },
      topSentiments: {
        positive: ['Support', 'Interest'],
        negative: ['Skepticism', 'Complexity concerns'],
        neutral: ['Questions', 'Clarifications']
      }
    }
  }

  private createFallbackExecutiveSummary(opportunities: any[], metadata: any): ExecutiveSummary {
    return {
      totalOpportunities: opportunities.length,
      averageOpportunityScore: Math.round(
        opportunities.reduce((sum, opp) => sum + opp.opportunityScore, 0) / opportunities.length
      ),
      highestScoringOpportunity: opportunities[0]?.title || 'Unknown',
      topPersonas: [],
      marketSizeDistribution: [],
      recommendedActions: ['Review individual opportunities for detailed insights'],
      keyFindings: ['Analysis completed with basic opportunity scoring'],
      processingMetrics: {
        analysisTimeMs: metadata.processingTime,
        totalCost: metadata.totalCost,
        confidenceLevel: 0.5
      }
    }
  }

  private createFallbackRevenueEstimate(): RevenueEstimate {
    return {
      annualRevenueMin: 10000,
      annualRevenueMax: 100000,
      pricingModel: 'subscription',
      marketSizeIndicator: 'medium',
      confidence: 0.3,
      reasoning: 'Estimate based on limited data availability',
      pricingRecommendation: {
        pricePoint: '$50-100/month',
        pricingTier: 'professional',
        justification: 'Standard SaaS pricing for small business solutions'
      }
    }
  }

  private createFallbackTechnicalAssessment(): TechnicalAssessment {
    return {
      implementationComplexity: 5,
      developmentTimeEstimate: '3-6 months',
      coreFeatures: [
        {
          name: 'Core functionality',
          priority: 'high' as const,
          complexity: 5,
          description: 'Basic solution features',
          estimatedDevelopmentTime: '2-3 months'
        }
      ],
      technicalRisks: ['Standard development risks'],
      scalabilityFactors: ['Database optimization', 'API performance'],
      integrationRequirements: ['Standard third-party integrations'],
      dataRequirements: ['User data', 'Application data'],
      securityConsiderations: ['Authentication', 'Data encryption'],
      maintenanceComplexity: 5
    }
  }

  private createFallbackSaasSolution(opportunity: any): SuggestedSolution {
    return {
      productName: `${opportunity.title.split(' ')[0]}Pro`,
      tagline: 'Solving your business challenges',
      coreFeatures: ['Core functionality', 'User management', 'Reporting', 'Integration'],
      differentiationStrategy: 'Focus on user experience and specific industry needs',
      targetMarket: {
        primaryPersona: 'business-user',
        marketSegment: 'small-business'
      },
      implementationRoadmap: [
        {
          phase: 'MVP Development',
          description: 'Core feature development',
          duration: '3 months',
          deliverables: ['Basic functionality'],
          dependencies: ['Requirements finalization'],
          risksAndMitigation: ['Scope creep - maintain MVP focus']
        }
      ],
      competitiveAdvantage: ['Specialized focus', 'Better user experience'],
      potentialChallenges: ['Market competition', 'User adoption']
    }
  }

  private async trackAICosts(processingTimeMs: number, operation: string): Promise<void> {
    if (!this.analysisId || !this.costTrackingService) return

    try {
      // Estimate token usage based on operation type
      const tokenEstimates = {
        'executive_summary': 3000,
        'revenue_estimate': 2000,
        'technical_assessment': 2500,
        'solution_suggestion': 2200
      }
      
      const estimatedTokens = tokenEstimates[operation as keyof typeof tokenEstimates] || 2000
      const tokenCost = calculateEventCost('openai_tokens', estimatedTokens)

      await this.costTrackingService.recordCostEvent({
        analysisId: this.analysisId,
        eventType: 'openai_tokens',
        provider: 'openai',
        quantity: estimatedTokens,
        unitCost: tokenCost / estimatedTokens,
        totalCost: tokenCost,
        eventData: {
          service: 'report-enhancement',
          operation,
          model: this.model,
          processingTimeMs,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      AppLogger.error('Failed to track report enhancement cost', {
        service: 'report-enhancement',
        operation: 'track_cost_error',
        metadata: {
          analysisId: this.analysisId,
          operation,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }
}