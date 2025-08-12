import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth/auth-guard'
import { ApiErrorHandler } from '@/lib/utils/api-response'

async function handlePOST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = (request as any).user
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

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  return withAuth(handlePOST)(request, context)
}