import { NextRequest, NextResponse } from 'next/server'
import { ReportAnalyticsService } from '@/lib/services/report-analytics.service'
import { AppLogger } from '@/lib/observability/logger'
import { withAuth } from '@/lib/auth/auth-guard'
import { z } from 'zod'

/**
 * Report-specific Analytics API
 * AC: 10 - Report analytics and usage tracking
 */

const trackEventSchema = z.object({
  eventType: z.enum(['view', 'export']),
  sessionData: z.object({
    viewDuration: z.number().optional(),
    deviceType: z.string().optional(),
    userAgent: z.string().optional(),
    referrer: z.string().optional()
  }).optional(),
  exportData: z.object({
    format: z.string(),
    type: z.enum(['full', 'summary', 'opportunity']),
    exportTime: z.number(),
    fileSize: z.number(),
    success: z.boolean()
  }).optional()
})

async function getReportAnalytics(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reportId = params.id
    const userId = (request as any).user?.id

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    AppLogger.info('Fetching report analytics', {
      service: 'analytics-api',
      operation: 'get_report_analytics',
      metadata: {
        reportId,
        userId
      }
    })

    const analyticsService = new ReportAnalyticsService()
    const analytics = await analyticsService.getReportAnalytics(reportId, userId)

    return NextResponse.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    AppLogger.error('Failed to fetch report analytics', {
      service: 'analytics-api',
      operation: 'get_report_analytics_error',
      metadata: {
        reportId: params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

async function trackEvent(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reportId = params.id
    const userId = (request as any).user?.id

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = trackEventSchema.parse(body)

    AppLogger.info('Tracking analytics event', {
      service: 'analytics-api',
      operation: 'track_event',
      metadata: {
        reportId,
        userId,
        eventType: validatedData.eventType
      }
    })

    const analyticsService = new ReportAnalyticsService()

    switch (validatedData.eventType) {
      case 'view':
        await analyticsService.trackReportView(reportId, userId, validatedData.sessionData)
        break

      case 'export':
        if (!validatedData.exportData) {
          return NextResponse.json(
            { error: 'Export data required for export events' },
            { status: 400 }
          )
        }
        await analyticsService.trackPDFExport(reportId, userId, validatedData.exportData)
        break

      default:
        return NextResponse.json(
          { error: 'Invalid event type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: 'Event tracked successfully'
    })

  } catch (error) {
    AppLogger.error('Failed to track event', {
      service: 'analytics-api',
      operation: 'track_event_error',
      metadata: {
        reportId: params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid event data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    )
  }
}

// Export with authentication
export const GET = withAuth(getReportAnalytics)
export const POST = withAuth(trackEvent)

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}