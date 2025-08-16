import { NextRequest, NextResponse } from 'next/server'
import { ReportSharingService } from '@/lib/services/report-sharing.service'
import { AppLogger } from '@/lib/observability/logger'
import { withAuth } from '@/lib/auth/auth-guard'

/**
 * Individual Share Link Management API
 * AC: 8 - Report sharing with privacy controls and link management
 */

async function revokeShareLink(request: NextRequest, { params }: { params: { id: string, token: string } }) {
  try {
    const shareToken = params.token
    const userId = (request as any).user?.id

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    AppLogger.info('Revoking share link', {
      service: 'report-sharing-api',
      operation: 'revoke_share_link',
      metadata: {
        shareToken,
        userId
      }
    })

    const sharingService = new ReportSharingService()
    await sharingService.revokeShareLink(shareToken, userId)

    return NextResponse.json({
      success: true,
      message: 'Share link revoked successfully'
    })

  } catch (error) {
    AppLogger.error('Failed to revoke share link', {
      service: 'report-sharing-api',
      operation: 'revoke_share_link_error',
      metadata: {
        shareToken: params.token,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// Export with authentication
export const DELETE = withAuth(revokeShareLink)

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}