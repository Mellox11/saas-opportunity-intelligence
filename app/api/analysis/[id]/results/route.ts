import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'

// Query parameters schema
const resultsQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
  offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
  sortBy: z.enum(['score', 'confidence', 'created']).optional().default('score'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  minScore: z.string().optional().transform(val => val ? parseInt(val, 10) : 70)
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const analysisId = params.id
    const { searchParams } = new URL(request.url)
    
    // Parse and validate query parameters
    const queryValidation = resultsQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!queryValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters' },
        { status: 400 }
      )
    }

    const { limit, offset, sortBy, order, minScore } = queryValidation.data

    // Check analysis ownership and status
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId: session.user.id
      },
      select: {
        id: true,
        status: true,
        completedAt: true,
        configuration: true,
        metadata: true
      }
    })

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'Analysis not found' },
        { status: 404 }
      )
    }

    if (analysis.status !== 'completed') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Analysis not completed',
          status: analysis.status
        },
        { status: 400 }
      )
    }

    // Build sort configuration
    const sortField = sortBy === 'score' ? 'opportunityScore' 
                    : sortBy === 'confidence' ? 'confidenceScore'
                    : 'createdAt'

    // Get opportunities with pagination
    const [opportunities, totalCount] = await Promise.all([
      prisma.opportunity.findMany({
        where: {
          analysisId,
          opportunityScore: { gte: minScore }
        },
        orderBy: { [sortField]: order },
        skip: offset,
        take: Math.min(limit, 100), // Cap at 100 results per request
        include: {
          sourcePost: {
            select: {
              id: true,
              redditId: true,
              subreddit: true,
              title: true,
              content: true,
              score: true,
              numComments: true,
              createdUtc: true,
              url: true,
              permalink: true
            }
          }
        }
      }),
      prisma.opportunity.count({
        where: {
          analysisId,
          opportunityScore: { gte: minScore }
        }
      })
    ])

    // Get analysis statistics
    const [totalPosts, totalOpportunities, avgScore] = await Promise.all([
      prisma.redditPost.count({ where: { analysisId } }),
      prisma.opportunity.count({ where: { analysisId } }),
      prisma.opportunity.aggregate({
        where: { analysisId },
        _avg: { opportunityScore: true }
      })
    ])

    // Format opportunities
    const formattedOpportunities = opportunities.map(opp => ({
      id: opp.id,
      title: opp.title,
      problemStatement: opp.problemStatement,
      opportunityScore: opp.opportunityScore,
      confidenceScore: opp.confidenceScore,
      urgencyScore: opp.urgencyScore,
      marketSignalsScore: opp.marketSignalsScore,
      feasibilityScore: opp.feasibilityScore,
      classification: opp.classification,
      evidence: Array.isArray(opp.evidence) ? opp.evidence : JSON.parse(opp.evidence as string || '[]'),
      antiPatterns: opp.antiPatterns ? (
        Array.isArray(opp.antiPatterns) ? opp.antiPatterns : JSON.parse(opp.antiPatterns as string)
      ) : null,
      metadata: opp.metadata ? (
        typeof opp.metadata === 'object' ? opp.metadata : JSON.parse(opp.metadata as string)
      ) : null,
      createdAt: opp.createdAt,
      sourcePost: opp.sourcePost ? {
        id: opp.sourcePost.id,
        redditId: opp.sourcePost.redditId,
        subreddit: opp.sourcePost.subreddit,
        title: opp.sourcePost.title,
        content: opp.sourcePost.content,
        score: opp.sourcePost.score,
        numComments: opp.sourcePost.numComments,
        createdUtc: opp.sourcePost.createdUtc,
        url: opp.sourcePost.url,
        permalink: opp.sourcePost.permalink
      } : null
    }))

    return NextResponse.json({
      success: true,
      analysis: {
        id: analysis.id,
        status: analysis.status,
        completedAt: analysis.completedAt,
        configuration: analysis.configuration
      },
      results: {
        opportunities: formattedOpportunities,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        },
        statistics: {
          totalPosts,
          totalOpportunities,
          filteredOpportunities: totalCount,
          conversionRate: totalPosts > 0 ? (totalOpportunities / totalPosts) * 100 : 0,
          avgOpportunityScore: Math.round(avgScore._avg.opportunityScore || 0)
        }
      }
    })

  } catch (error) {
    console.error(`Analysis results error for ${params.id}:`, error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}