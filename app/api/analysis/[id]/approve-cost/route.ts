import { NextRequest, NextResponse } from 'next/server'
import { ApiErrorHandler } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Lazy load Prisma to avoid build-time database connections
    const { prisma } = await import('@/lib/db')
    
    // Get session token from cookies
    const sessionToken = request.cookies.get('session-token')
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
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
        { error: 'Session expired' },
        { status: 401 }
      )
    }

    const user = session.user
    const analysisId = params.id
    const body = await request.json()

    // Verify ownership
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId: user.id
      }
    })

    if (!analysis) {
      return ApiErrorHandler.notFound('Analysis not found')
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

    return ApiErrorHandler.success({
      message: 'Cost approved successfully',
      analysis: updated
    })
  } catch (error) {
    return ApiErrorHandler.handleError(error, 'Approve cost')
  }
}