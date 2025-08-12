import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Extract analysisId from request body instead of URL params
    const body = await request.json()
    const { analysisId } = body
    
    if (!analysisId) {
      return NextResponse.json(
        { error: 'Analysis ID is required' },
        { status: 400 }
      )
    }

    // Get session token from cookies
    const sessionToken = request.cookies.get('session-token')
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Lazy load all dependencies to avoid any build-time evaluation
    const [{ prisma }, { ApiErrorHandler }] = await Promise.all([
      import('@/lib/db'),
      import('@/lib/utils/api-response')
    ])
    
    // Verify session
    const session = await prisma.session.findUnique({
      where: { sessionToken: sessionToken.value },
      include: { user: true }
    })
    
    if (!session || session.expires < new Date()) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      )
    }

    const user = session.user

    // Verify ownership
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId: user.id
      }
    })

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      )
    }

    // Update analysis with cost approval
    const updated = await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'cost_approved',
        estimatedCost: body.estimatedCost,
        budgetLimit: body.budgetLimit,
        metadata: JSON.stringify({
          ...JSON.parse(analysis.metadata || '{}'),
          costApprovedAt: new Date().toISOString(),
          costApprovedBy: user.id
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Cost approved successfully',
      analysis: updated
    })
  } catch (error) {
    console.error('Approve cost error:', error)
    return NextResponse.json(
      { error: 'Failed to approve cost' },
      { status: 500 }
    )
  }
}