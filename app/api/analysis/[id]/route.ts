import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth/auth-guard'
import { ApiErrorHandler } from '@/lib/utils/api-response'

async function handleGET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = (request as any).user
    const analysisId = params.id

    // Fetch the analysis with user validation
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId: user.id
      }
    })

    if (!analysis) {
      return ApiErrorHandler.notFound('Analysis not found')
    }

    return ApiErrorHandler.success(analysis)
  } catch (error) {
    return ApiErrorHandler.handleError(error, 'Get analysis')
  }
}

async function handlePUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Update analysis
    const updated = await prisma.analysis.update({
      where: { id: analysisId },
      data: body
    })

    return ApiErrorHandler.success(updated)
  } catch (error) {
    return ApiErrorHandler.handleError(error, 'Update analysis')
  }
}

async function handleDELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = (request as any).user
    const analysisId = params.id

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

    // Delete analysis
    await prisma.analysis.delete({
      where: { id: analysisId }
    })

    return ApiErrorHandler.success({ message: 'Analysis deleted successfully' })
  } catch (error) {
    return ApiErrorHandler.handleError(error, 'Delete analysis')
  }
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  return withAuth(handleGET)(request, context)
}

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  return withAuth(handlePUT)(request, context)
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  return withAuth(handleDELETE)(request, context)
}