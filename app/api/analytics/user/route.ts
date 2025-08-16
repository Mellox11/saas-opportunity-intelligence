import { NextRequest, NextResponse } from 'next/server'
import { ReportAnalyticsService } from '@/lib/services/report-analytics.service'
import { AppLogger } from '@/lib/observability/logger'
import { withAuth } from '@/lib/auth/auth-guard'

/**
 * User Analytics API
 * AC: 10 - User-specific analytics and engagement metrics
 */

async function getUserAnalytics(request: NextRequest) {
  try {
    const userId = (request as any).user?.id

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    AppLogger.info('Fetching user analytics', {
      service: 'analytics-api',
      operation: 'get_user_analytics',
      metadata: { userId }
    })

    const analyticsService = new ReportAnalyticsService()
    const analytics = await analyticsService.getUserAnalytics(userId)

    return NextResponse.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    AppLogger.error('Failed to fetch user analytics', {
      service: 'analytics-api',
      operation: 'get_user_analytics_error',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return NextResponse.json(
      { error: 'Failed to fetch user analytics' },
      { status: 500 }
    )
  }
}

// Export with authentication
export const GET = withAuth(getUserAnalytics)

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}