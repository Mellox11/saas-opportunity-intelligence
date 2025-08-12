import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/auth/auth-guard"
import { ApiErrorHandler } from "@/lib/utils/api-response"

export const dynamic = 'force-dynamic'

async function handleGET(request: NextRequest) {
  try {
    const user = (request as any).user

    // Fetch all analyses for the user
    const analyses = await prisma.analysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        estimatedCost: true,
        actualCost: true,
        configuration: true,
        createdAt: true,
        completedAt: true
      }
    })

    // Format analyses for frontend
    const formattedAnalyses = analyses.map(analysis => ({
      id: analysis.id,
      status: analysis.status,
      cost: analysis.actualCost || analysis.estimatedCost || 0,
      createdAt: analysis.createdAt.toISOString(),
      completedAt: analysis.completedAt?.toISOString() || null,
      configuration: JSON.parse(analysis.configuration || "{}")
    }))

    return ApiErrorHandler.success({
      analyses: formattedAnalyses,
      total: formattedAnalyses.length
    })
  } catch (error) {
    return ApiErrorHandler.handleError(error, "List analyses")
  }
}

export async function GET(request: NextRequest) {
  return withAuth(handleGET)(request)
}
