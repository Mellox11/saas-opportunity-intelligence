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

    // Get JWT token from cookies
    const authToken = request.cookies.get('auth-token')
    
    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Lazy load all dependencies to avoid any build-time evaluation
    const [{ prisma }, { ApiErrorHandler }, { AuthService }] = await Promise.all([
      import('@/lib/db'),
      import('@/lib/utils/api-response'),
      import('@/lib/auth/jwt')
    ])
    
    // Verify JWT token
    const tokenUser = AuthService.verifyToken(authToken.value)
    
    if (!tokenUser) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const user = { id: tokenUser.userId, email: tokenUser.email }

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