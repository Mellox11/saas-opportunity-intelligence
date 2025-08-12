import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AnalysisOrchestrationService } from '@/lib/services/analysis-orchestration.service'
import { getServerSession } from 'next-auth'

export async function POST(
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

    // Check analysis ownership and status
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId: session.user.id
      },
      select: {
        id: true,
        status: true,
        createdAt: true
      }
    })

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'Analysis not found' },
        { status: 404 }
      )
    }

    // Check if analysis can be cancelled
    if (!['pending', 'cost_approved', 'processing'].includes(analysis.status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Analysis cannot be cancelled',
          currentStatus: analysis.status
        },
        { status: 400 }
      )
    }

    // Cancel the analysis
    const orchestrationService = new AnalysisOrchestrationService()
    await orchestrationService.cancelAnalysis(analysisId)

    return NextResponse.json({
      success: true,
      message: 'Analysis cancelled successfully',
      analysisId,
      cancelledAt: new Date()
    })

  } catch (error) {
    console.error(`Analysis cancellation error for ${params.id}:`, error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to cancel analysis'
      },
      { status: 500 }
    )
  }
}