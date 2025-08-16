import { Job } from 'bull'
import { prisma } from '@/lib/db'

export interface ReportGenerationJobData {
  analysisId: string
}

export const processReportGenerationJob = async (job: Job<ReportGenerationJobData>) => {
  const { analysisId } = job.data
  
  console.log(`Starting report generation for analysis ${analysisId}`)
  
  try {
    await job.progress(20)
    
    // Get opportunities for the analysis
    const opportunities = await prisma.opportunity.findMany({
      where: { analysisId },
      orderBy: { opportunityScore: 'desc' },
      take: 50, // Top 50 opportunities
      include: {
        sourcePost: true
      }
    })
    
    await job.progress(60)
    
    // Generate summary statistics
    const stats = await generateAnalysisStats(analysisId)
    
    await job.progress(80)
    
    // Store report metadata (for now, just update analysis metadata)
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        metadata: JSON.stringify({
          reportGenerated: true,
          reportStats: stats,
          topOpportunities: opportunities.slice(0, 10).map(opp => ({
            id: opp.id,
            title: opp.title,
            score: opp.opportunityScore,
            subreddit: opp.sourcePost?.subreddit
          }))
        })
      }
    })
    
    await job.progress(100)
    
    console.log(`Report generation completed for analysis ${analysisId}`)
    
    return {
      success: true,
      opportunitiesCount: opportunities.length,
      reportStats: stats
    }
  } catch (error) {
    console.error(`Report generation failed for analysis ${analysisId}:`, error)
    throw error
  }
}

async function generateAnalysisStats(analysisId: string) {
  const [
    totalPosts,
    totalOpportunities,
    avgOpportunityScore,
    subredditDistribution
  ] = await Promise.all([
    prisma.redditPost.count({ where: { analysisId } }),
    prisma.opportunity.count({ where: { analysisId } }),
    prisma.opportunity.aggregate({
      where: { analysisId },
      _avg: { opportunityScore: true }
    }),
    // Get subreddit distribution manually since we can't groupBy on relation field
    prisma.opportunity.findMany({
      where: { analysisId },
      include: { sourcePost: { select: { subreddit: true } } }
    }).then(opportunities => {
      const distribution = opportunities.reduce((acc, opp) => {
        const subreddit = opp.sourcePost?.subreddit || 'unknown'
        acc[subreddit] = (acc[subreddit] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      return Object.entries(distribution).map(([subreddit, count]) => ({ subreddit, count }))
    })
  ])
  
  return {
    totalPosts,
    totalOpportunities,
    conversionRate: totalPosts > 0 ? (totalOpportunities / totalPosts) * 100 : 0,
    avgOpportunityScore: Math.round(avgOpportunityScore._avg.opportunityScore || 0),
    subredditDistribution
  }
}