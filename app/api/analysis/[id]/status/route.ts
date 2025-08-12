import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AnalysisOrchestrationService } from '@/lib/services/analysis-orchestration.service'
import { getServerSession } from 'next-auth'

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

    // Get analysis with ownership check
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId: session.user.id
      },
      select: {
        id: true,
        status: true,
        progress: true,
        createdAt: true,
        completedAt: true,
        estimatedCost: true,
        maxCost: true,
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

    // Get detailed progress from orchestration service
    const orchestrationService = new AnalysisOrchestrationService()
    const currentProgress = await orchestrationService.getAnalysisProgress(analysisId)

    // Calculate estimated completion time
    let estimatedCompletion: Date | null = null
    if (analysis.status === 'processing' && currentProgress) {
      const elapsedMinutes = (Date.now() - analysis.createdAt.getTime()) / (1000 * 60)
      const progressPercent = Math.max(currentProgress.percentage, 1) // Avoid division by zero
      const totalEstimatedMinutes = (elapsedMinutes / progressPercent) * 100
      const remainingMinutes = Math.max(totalEstimatedMinutes - elapsedMinutes, 0)
      
      estimatedCompletion = new Date(Date.now() + remainingMinutes * 60 * 1000)
    }

    // Get real-time statistics if analysis is complete
    let statistics = null
    if (analysis.status === 'completed') {
      const [postsCount, opportunitiesCount] = await Promise.all([
        prisma.redditPost.count({ where: { analysisId } }),
        prisma.opportunity.count({ where: { analysisId } })
      ])

      statistics = {
        totalPosts: postsCount,
        opportunitiesFound: opportunitiesCount,
        conversionRate: postsCount > 0 ? (opportunitiesCount / postsCount) * 100 : 0,
        processingTimeMinutes: analysis.completedAt 
          ? Math.round((analysis.completedAt.getTime() - analysis.createdAt.getTime()) / 60000)
          : null
      }
    }

    return NextResponse.json({
      success: true,
      analysis: {
        id: analysis.id,
        status: analysis.status,
        progress: currentProgress || (analysis.progress ? JSON.parse(analysis.progress as string) : null),
        createdAt: analysis.createdAt,
        completedAt: analysis.completedAt,
        estimatedCompletion,
        estimatedCost: analysis.estimatedCost,
        maxCost: analysis.maxCost,
        configuration: analysis.configuration,
        statistics
      }
    })

  } catch (error) {
    console.error(`Analysis status error for ${params.id}:`, error)
    
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