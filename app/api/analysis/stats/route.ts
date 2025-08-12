import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth/auth-guard'
import { ApiErrorHandler } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

async function handleGET(request: NextRequest) {
  try {
    const user = (request as any).user

    // Fetch all analyses for the user
    const analyses = await prisma.analysis.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        status: true,
        estimatedCost: true,
        actualCost: true,
        configuration: true
      }
    })

    // Calculate statistics
    const totalAnalyses = analyses.filter(a => 
      ['completed', 'cost_approved', 'processing'].includes(a.status)
    ).length
    
    // For simulation, count opportunities based on analyses
    // In real implementation, this would query the opportunities table
    const opportunitiesFound = totalAnalyses * 5 // Simulating 5 opportunities per analysis
    
    // Calculate total spent (use estimatedCost for simulation)
    const totalSpent = analyses.reduce((sum, analysis) => {
      const cost = analysis.actualCost || analysis.estimatedCost || 0
      return sum + cost
    }, 0)

    return ApiErrorHandler.success({
      totalAnalyses,
      opportunitiesFound,
      totalSpent,
      recentAnalyses: analyses.slice(0, 5).map(a => ({
        id: a.id,
        status: a.status,
        cost: a.actualCost || a.estimatedCost || 0,
        configuration: JSON.parse(a.configuration || '{}')
      }))
    })
  } catch (error) {
    return ApiErrorHandler.handleError(error, 'Get analysis stats')
  }
}

export async function GET(request: NextRequest) {
  return withAuth(handleGET)(request)
}