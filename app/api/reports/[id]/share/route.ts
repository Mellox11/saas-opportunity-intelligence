import { NextRequest, NextResponse } from 'next/server'
import { ReportSharingService } from '@/lib/services/report-sharing.service'
import { AppLogger } from '@/lib/observability/logger'
import { withAuth } from '@/lib/auth/auth-guard'
import { z } from 'zod'

/**
 * Report Sharing API Routes
 * AC: 8 - Report sharing with privacy controls, expiration dates, and password protection
 */

const createShareSchema = z.object({
  expiresAt: z.string().datetime().optional(),
  password: z.string().min(4).optional(),
  allowDownload: z.boolean().default(true),
  allowPrint: z.boolean().default(true),
  recipientEmail: z.string().email().optional(),
  shareNote: z.string().max(500).optional()
})

const updatePrivacySchema = z.object({
  isPublic: z.boolean().optional(),
  allowSharing: z.boolean().optional(),
  requirePassword: z.boolean().optional(),
  defaultExpirationDays: z.number().min(1).max(365).optional()
})

async function createShareLink(request: NextRequest, { params }: { params: { id: string } }) {
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
    const validatedData = createShareSchema.parse(body)

    AppLogger.info('Creating share link for report', {
      service: 'report-sharing-api',
      operation: 'create_share_link',
      metadata: {
        reportId,
        userId,
        hasPassword: !!validatedData.password,
        hasExpiration: !!validatedData.expiresAt
      }
    })

    const sharingService = new ReportSharingService()
    
    const shareResponse = await sharingService.createShareLink({
      reportId,
      userId,
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
      password: validatedData.password,
      allowDownload: validatedData.allowDownload,
      allowPrint: validatedData.allowPrint,
      recipientEmail: validatedData.recipientEmail,
      shareNote: validatedData.shareNote
    })

    return NextResponse.json({
      success: true,
      data: shareResponse
    })

  } catch (error) {
    AppLogger.error('Failed to create share link', {
      service: 'report-sharing-api',
      operation: 'create_share_link_error',
      metadata: {
        reportId: params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getShareAnalytics(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reportId = params.id
    const userId = (request as any).user?.id

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const sharingService = new ReportSharingService()
    const analytics = await sharingService.getReportSharingAnalytics(reportId, userId)

    return NextResponse.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    AppLogger.error('Failed to get share analytics', {
      service: 'report-sharing-api',
      operation: 'get_share_analytics_error',
      metadata: {
        reportId: params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

async function updatePrivacySettings(request: NextRequest, { params }: { params: { id: string } }) {
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
    const validatedData = updatePrivacySchema.parse(body)

    const sharingService = new ReportSharingService()
    await sharingService.updateReportPrivacy(reportId, userId, validatedData)

    return NextResponse.json({
      success: true,
      message: 'Privacy settings updated successfully'
    })

  } catch (error) {
    AppLogger.error('Failed to update privacy settings', {
      service: 'report-sharing-api',
      operation: 'update_privacy_settings_error',
      metadata: {
        reportId: params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// Export with authentication
export const POST = withAuth(createShareLink)
export const GET = withAuth(getShareAnalytics)
export const PUT = withAuth(updatePrivacySettings)

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}