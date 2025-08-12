import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Lazy load all dependencies
    const [{ prisma }, { AnalysisOrchestrationService }] = await Promise.all([
      import('@/lib/db'),
      import('@/lib/services/analysis-orchestration.service')
    ])

    // Get session token from cookies
    const sessionToken = request.cookies.get('session-token')
    
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Verify session
    const session = await prisma.session.findUnique({
      where: { sessionToken: sessionToken.value },
      include: { user: true }
    })
    
    if (!session || session.expires < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      )
    }

    const user = session.user
    const analysisId = params.id

    // Check analysis ownership and status
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId: user.id
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