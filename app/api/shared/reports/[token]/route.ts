import { NextRequest, NextResponse } from 'next/server'
import { ReportSharingService } from '@/lib/services/report-sharing.service'
import { AppLogger } from '@/lib/observability/logger'
import { z } from 'zod'

/**
 * Public Shared Report Access API
 * AC: 8 - Public access to shared reports with password protection
 */

const accessRequestSchema = z.object({
  password: z.string().optional(),
  requestInfo: z.object({
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
    referrer: z.string().optional()
  }).optional()
})

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const shareToken = params.token
    
    const body = await request.json()
    const validatedData = accessRequestSchema.parse(body)

    // Extract request information
    const requestInfo = {
      userAgent: validatedData.requestInfo?.userAgent || request.headers.get('user-agent') || undefined,
      ipAddress: validatedData.requestInfo?.ipAddress || getClientIP(request),
      referrer: validatedData.requestInfo?.referrer || request.headers.get('referer') || undefined
    }

    AppLogger.info('Accessing shared report', {
      service: 'shared-report-api',
      operation: 'access_shared_report',
      metadata: {
        shareToken,
        hasPassword: !!validatedData.password,
        userAgent: requestInfo.userAgent,
        ipAddress: requestInfo.ipAddress
      }
    })

    const sharingService = new ReportSharingService()
    
    const reportData = await sharingService.accessSharedReport(
      shareToken,
      validatedData.password,
      requestInfo
    )

    return NextResponse.json({
      success: true,
      data: reportData
    })

  } catch (error) {
    AppLogger.error('Failed to access shared report', {
      service: 'shared-report-api',
      operation: 'access_shared_report_error',
      metadata: {
        shareToken: params.token,
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

    // Handle specific sharing errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (errorMessage.includes('Password required')) {
      return NextResponse.json(
        { error: 'Password required for this shared report' },
        { status: 401 }
      )
    }

    if (errorMessage.includes('Invalid password')) {
      return NextResponse.json(
        { error: 'Invalid password provided' },
        { status: 401 }
      )
    }

    if (errorMessage.includes('expired')) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      )
    }

    if (errorMessage.includes('not found') || errorMessage.includes('disabled')) {
      return NextResponse.json(
        { error: 'Share link not found or has been disabled' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to access shared report' },
      { status: 500 }
    )
  }
}

// Handle CORS preflight for public access
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  })
}

// Helper function to extract client IP
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  return 'unknown'
}