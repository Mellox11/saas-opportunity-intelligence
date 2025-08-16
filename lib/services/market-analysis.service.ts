import { prisma } from '@/lib/db'
import { AppLogger } from '@/lib/observability/logger'
import { 
  MarketAnalysis,
  TrendingTopic,
  PersonaDistribution,
  IndustryVertical,
  ProblemFrequency,
  SeasonalPattern
} from '@/lib/types/report'
import { DimensionalAnalysis } from '@/lib/types/dimensional-analysis'

/**
 * Market Analysis Service for aggregating insights across opportunities
 * AC: 4 - Market analysis section with trending topics, problem frequency analysis, and seasonal patterns
 */
export class MarketAnalysisService {
  constructor(private analysisId?: string) {}

  /**
   * Generate comprehensive market analysis from opportunities
   */
  async generateMarketAnalysis(
    opportunities: Array<{
      id: string
      title: string
      problemStatement: string
      opportunityScore: number
      scoringDimensions: string // JSON containing DimensionalAnalysis
      sourcePost: {
        subreddit: string
        score: number
        createdUtc: Date
        title: string
      }
    }>
  ): Promise<MarketAnalysis> {
    try {
      AppLogger.info('Starting market analysis generation', {
        service: 'market-analysis',
        operation: 'generate_analysis',
        metadata: {
          analysisId: this.analysisId,
          opportunityCount: opportunities.length
        }
      })

      // Parse dimensional analysis data
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

      // Generate all analysis components
      const [
        trendingTopics,
        personaDistribution,
        industryVerticals,
        problemFrequency,
        competitiveInsights,
        marketMaturity,
        seasonalPatterns
      ] = await Promise.all([
        this.analyzeTrendingTopics(dimensionalData),
        this.analyzePersonaDistribution(dimensionalData),
        this.analyzeIndustryVerticals(dimensionalData),
        this.analyzeProblemFrequency(opportunities),
        this.generateCompetitiveInsights(dimensionalData),
        this.determineMarketMaturity(dimensionalData),
        this.detectSeasonalPatterns(opportunities)
      ])

      const marketAnalysis: MarketAnalysis = {
        trendingTopics,
        seasonalPatterns,
        personaDistribution,
        industryVerticals,
        competitiveInsights,
        marketMaturity,
        problemFrequency
      }

      AppLogger.info('Market analysis generation completed', {
        service: 'market-analysis',
        operation: 'generate_analysis_completed',
        metadata: {
          analysisId: this.analysisId,
          trendingTopicsCount: trendingTopics.length,
          personasCount: personaDistribution.length,
          industriesCount: industryVerticals.length
        }
      })

      return marketAnalysis

    } catch (error) {
      AppLogger.error('Market analysis generation failed', {
        service: 'market-analysis',
        operation: 'generate_analysis_error',
        metadata: {
          analysisId: this.analysisId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      throw error
    }
  }

  /**
   * Analyze trending topics from opportunity titles and problem statements
   */
  private async analyzeTrendingTopics(
    opportunities: Array<{ 
      title: string
      problemStatement: string
      opportunityScore: number
      dimensions: DimensionalAnalysis
    }>
  ): Promise<TrendingTopic[]> {
    // Extract keywords and phrases from titles and problem statements
    const topicFrequency = new Map<string, {
      count: number
      totalScore: number
      keywords: Set<string>
    }>()

    opportunities.forEach(opp => {
      const text = `${opp.title} ${opp.problemStatement}`.toLowerCase()
      
      // Extract key phrases (2-3 words) and single important words
      const phrases = this.extractKeyPhrases(text)
      
      phrases.forEach(phrase => {
        if (!topicFrequency.has(phrase)) {
          topicFrequency.set(phrase, {
            count: 0,
            totalScore: 0,
            keywords: new Set()
          })
        }
        
        const data = topicFrequency.get(phrase)!
        data.count++
        data.totalScore += opp.opportunityScore
        
        // Add related keywords
        const words = text.split(/\s+/).filter(w => w.length > 3)
        words.forEach(word => data.keywords.add(word))
      })
    })

    // Convert to trending topics with scoring
    const trendingTopics: TrendingTopic[] = Array.from(topicFrequency.entries())
      .map(([topic, data]) => ({
        topic,
        frequency: data.count,
        score: Math.round(data.totalScore / data.count),
        growth: this.calculateTopicGrowth(topic, opportunities), // Simplified growth calculation
        relatedKeywords: Array.from(data.keywords).slice(0, 5)
      }))
      .filter(topic => topic.frequency >= 2) // Only topics mentioned multiple times
      .sort((a, b) => (b.frequency * b.score) - (a.frequency * a.score))
      .slice(0, 10) // Top 10 trending topics

    return trendingTopics
  }

  /**
   * Analyze persona distribution from dimensional analysis
   */
  private async analyzePersonaDistribution(
    opportunities: Array<{ dimensions: DimensionalAnalysis; opportunityScore: number }>
  ): Promise<PersonaDistribution[]> {
    const personaMap = new Map<string, {
      count: number
      totalScore: number
      industries: Set<string>
    }>()

    opportunities.forEach(opp => {
      const persona = opp.dimensions.persona.value
      const industry = opp.dimensions.industryVertical.value
      
      if (!personaMap.has(persona)) {
        personaMap.set(persona, {
          count: 0,
          totalScore: 0,
          industries: new Set()
        })
      }
      
      const data = personaMap.get(persona)!
      data.count++
      data.totalScore += opp.opportunityScore
      data.industries.add(industry)
    })

    const totalOpportunities = opportunities.length
    
    return Array.from(personaMap.entries())
      .map(([persona, data]) => ({
        persona,
        count: data.count,
        percentage: Math.round((data.count / totalOpportunities) * 100),
        avgScore: Math.round(data.totalScore / data.count),
        topIndustries: Array.from(data.industries).slice(0, 3)
      }))
      .sort((a, b) => b.count - a.count)
  }

  /**
   * Analyze industry vertical distribution
   */
  private async analyzeIndustryVerticals(
    opportunities: Array<{ dimensions: DimensionalAnalysis; opportunityScore: number }>
  ): Promise<IndustryVertical[]> {
    const industryMap = new Map<string, {
      count: number
      totalScore: number
      scores: number[]
    }>()

    opportunities.forEach(opp => {
      const industry = opp.dimensions.industryVertical.value
      
      if (!industryMap.has(industry)) {
        industryMap.set(industry, {
          count: 0,
          totalScore: 0,
          scores: []
        })
      }
      
      const data = industryMap.get(industry)!
      data.count++
      data.totalScore += opp.opportunityScore
      data.scores.push(opp.opportunityScore)
    })

    const totalOpportunities = opportunities.length
    
    return Array.from(industryMap.entries())
      .map(([vertical, data]) => ({
        vertical,
        count: data.count,
        percentage: Math.round((data.count / totalOpportunities) * 100),
        avgScore: Math.round(data.totalScore / data.count),
        growth: this.calculateIndustryGrowth(data.scores), // Based on score variance
        maturity: this.determineIndustryMaturity(vertical, data.avgScore) as 'emerging' | 'growing' | 'mature'
      }))
      .sort((a, b) => b.count - a.count)
  }

  /**
   * Analyze problem frequency and intensity
   */
  private async analyzeProblemFrequency(
    opportunities: Array<{
      problemStatement: string
      opportunityScore: number
      sourcePost: { createdUtc: Date }
    }>
  ): Promise<ProblemFrequency[]> {
    // Categorize problems by domain/type
    const problemCategories = this.categorizeProblemStatements(opportunities)
    
    return Array.from(problemCategories.entries())
      .map(([category, data]) => ({
        problemCategory: category,
        frequency: data.count,
        intensity: Math.round(data.avgIntensity),
        trendDirection: this.calculateTrendDirection(data.timeDistribution) as 'increasing' | 'stable' | 'decreasing'
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 8) // Top 8 problem categories
  }

  /**
   * Generate competitive insights based on existing solutions analysis
   */
  private async generateCompetitiveInsights(
    opportunities: Array<{ dimensions: DimensionalAnalysis }>
  ): Promise<string[]> {
    const insights: string[] = []
    
    // Analyze competition levels
    const competitionScores = opportunities.map(opp => opp.dimensions.existingSolutions.score)
    const avgCompetition = competitionScores.reduce((sum, score) => sum + score, 0) / competitionScores.length
    
    if (avgCompetition < 4) {
      insights.push('Market shows low competition with significant white space for new solutions')
    } else if (avgCompetition > 7) {
      insights.push('Highly competitive market requiring strong differentiation strategies')
    } else {
      insights.push('Moderate competition levels present opportunities for focused positioning')
    }
    
    // Analyze market readiness
    const budgetScores = opportunities.map(opp => opp.dimensions.budgetContext.score)
    const avgBudget = budgetScores.reduce((sum, score) => sum + score, 0) / budgetScores.length
    
    if (avgBudget > 6) {
      insights.push('Strong budget availability indicates market readiness for premium solutions')
    } else if (avgBudget < 4) {
      insights.push('Budget constraints suggest focus on cost-effective or freemium models')
    }
    
    // Analyze urgency patterns
    const emotionScores = opportunities.map(opp => opp.dimensions.emotionLevel.score)
    const avgEmotion = emotionScores.reduce((sum, score) => sum + score, 0) / emotionScores.length
    
    if (avgEmotion > 7) {
      insights.push('High urgency levels indicate fast adoption potential for effective solutions')
    }
    
    return insights
  }

  /**
   * Determine overall market maturity
   */
  private async determineMarketMaturity(
    opportunities: Array<{ dimensions: DimensionalAnalysis }>
  ): Promise<'emerging' | 'growing' | 'mature' | 'declining'> {
    const avgCompetition = opportunities
      .map(opp => opp.dimensions.existingSolutions.score)
      .reduce((sum, score) => sum + score, 0) / opportunities.length
    
    const avgTechnicalComplexity = opportunities
      .map(opp => opp.dimensions.technicalComplexity.score)
      .reduce((sum, score) => sum + score, 0) / opportunities.length
    
    if (avgCompetition < 3 && avgTechnicalComplexity > 6) {
      return 'emerging'
    } else if (avgCompetition < 6 && avgTechnicalComplexity > 4) {
      return 'growing'
    } else if (avgCompetition > 7) {
      return 'mature'
    } else {
      return 'growing'
    }
  }

  /**
   * Detect seasonal patterns in problem occurrence
   */
  private async detectSeasonalPatterns(
    opportunities: Array<{ sourcePost: { createdUtc: Date } }>
  ): Promise<SeasonalPattern[] | undefined> {
    // Group by month/quarter
    const monthlyDistribution = new Map<string, number>()
    
    opportunities.forEach(opp => {
      const month = opp.sourcePost.createdUtc.toISOString().substring(0, 7) // YYYY-MM
      monthlyDistribution.set(month, (monthlyDistribution.get(month) || 0) + 1)
    })
    
    // Only return patterns if we have enough data (6+ months)
    if (monthlyDistribution.size < 6) {
      return undefined
    }
    
    // Detect seasonal patterns (simplified implementation)
    const patterns: SeasonalPattern[] = []
    const values = Array.from(monthlyDistribution.values())
    const avgFrequency = values.reduce((sum, val) => sum + val, 0) / values.length
    
    // Detect high activity periods
    Array.from(monthlyDistribution.entries()).forEach(([month, count]) => {
      if (count > avgFrequency * 1.5) {
        const monthName = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long' })
        patterns.push({
          period: monthName,
          intensity: Math.min(10, Math.round((count / avgFrequency) * 5)),
          description: `Elevated problem frequency in ${monthName}`,
          confidence: 0.7
        })
      }
    })
    
    return patterns.length > 0 ? patterns : undefined
  }

  /**
   * Extract key phrases from text for trending analysis
   */
  private extractKeyPhrases(text: string): string[] {
    const phrases: string[] = []
    const words = text.split(/\s+/).filter(w => w.length > 2)
    
    // Add important single words
    const importantWords = words.filter(word => 
      /^(manage|track|automate|integration|platform|solution|tool|system|workflow|process)/.test(word)
    )
    phrases.push(...importantWords)
    
    // Add 2-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`
      if (phrase.length > 6 && !phrase.includes('the') && !phrase.includes('and')) {
        phrases.push(phrase)
      }
    }
    
    return phrases.filter((phrase, index, arr) => arr.indexOf(phrase) === index) // Unique phrases
  }

  /**
   * Calculate topic growth (simplified - in real implementation would compare with historical data)
   */
  private calculateTopicGrowth(topic: string, opportunities: Array<any>): number {
    // Simplified growth calculation based on recency
    const recentCount = opportunities
      .filter(opp => opp.sourcePost?.createdUtc && 
        (Date.now() - new Date(opp.sourcePost.createdUtc).getTime()) < 30 * 24 * 60 * 60 * 1000)
      .length
    
    const growthRate = (recentCount / opportunities.length) * 100
    return Math.round(Math.max(-50, Math.min(50, growthRate - 50))) // Normalized to -50 to +50
  }

  /**
   * Calculate industry growth based on score variance
   */
  private calculateIndustryGrowth(scores: number[]): number {
    if (scores.length < 2) return 0
    
    // Simple growth indicator based on score distribution
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
    return Math.round((avgScore - 70) * 2) // Normalized growth indicator
  }

  /**
   * Determine industry maturity based on characteristics
   */
  private determineIndustryMaturity(industry: string, avgScore: number): string {
    // Simplified maturity determination
    if (industry.includes('ai') || industry.includes('blockchain') || industry.includes('crypto')) {
      return 'emerging'
    } else if (avgScore > 75) {
      return 'mature'
    } else {
      return 'growing'
    }
  }

  /**
   * Categorize problem statements into domains
   */
  private categorizeProblemStatements(
    opportunities: Array<{
      problemStatement: string
      opportunityScore: number
      sourcePost: { createdUtc: Date }
    }>
  ): Map<string, { 
    count: number
    avgIntensity: number
    timeDistribution: Date[]
  }> {
    const categories = new Map<string, { 
      count: number
      totalIntensity: number
      timeDistribution: Date[]
    }>()
    
    opportunities.forEach(opp => {
      const category = this.classifyProblemDomain(opp.problemStatement)
      
      if (!categories.has(category)) {
        categories.set(category, {
          count: 0,
          totalIntensity: 0,
          timeDistribution: []
        })
      }
      
      const data = categories.get(category)!
      data.count++
      data.totalIntensity += opp.opportunityScore
      data.timeDistribution.push(opp.sourcePost.createdUtc)
    })
    
    // Convert to final format
    const result = new Map<string, { 
      count: number
      avgIntensity: number
      timeDistribution: Date[]
    }>()
    
    categories.forEach((data, category) => {
      result.set(category, {
        count: data.count,
        avgIntensity: data.totalIntensity / data.count,
        timeDistribution: data.timeDistribution
      })
    })
    
    return result
  }

  /**
   * Classify problem statement into domain category
   */
  private classifyProblemDomain(problemStatement: string): string {
    const text = problemStatement.toLowerCase()
    
    if (text.includes('inventory') || text.includes('stock') || text.includes('warehouse')) {
      return 'Inventory Management'
    } else if (text.includes('customer') || text.includes('crm') || text.includes('client')) {
      return 'Customer Management'
    } else if (text.includes('project') || text.includes('task') || text.includes('workflow')) {
      return 'Project Management'
    } else if (text.includes('finance') || text.includes('invoice') || text.includes('payment')) {
      return 'Financial Management'
    } else if (text.includes('communication') || text.includes('collaboration') || text.includes('team')) {
      return 'Communication & Collaboration'
    } else if (text.includes('data') || text.includes('analytics') || text.includes('report')) {
      return 'Data & Analytics'
    } else if (text.includes('marketing') || text.includes('sales') || text.includes('lead')) {
      return 'Sales & Marketing'
    } else if (text.includes('hr') || text.includes('employee') || text.includes('recruitment')) {
      return 'Human Resources'
    } else {
      return 'General Business Operations'
    }
  }

  /**
   * Calculate trend direction for time series data
   */
  private calculateTrendDirection(timeDistribution: Date[]): string {
    if (timeDistribution.length < 3) return 'stable'
    
    // Sort by date
    const sortedDates = timeDistribution.sort((a, b) => a.getTime() - b.getTime())
    
    // Compare first half vs second half frequency
    const midpoint = Math.floor(sortedDates.length / 2)
    const firstHalf = sortedDates.slice(0, midpoint).length
    const secondHalf = sortedDates.slice(midpoint).length
    
    if (secondHalf > firstHalf * 1.2) {
      return 'increasing'
    } else if (firstHalf > secondHalf * 1.2) {
      return 'decreasing'
    } else {
      return 'stable'
    }
  }
}