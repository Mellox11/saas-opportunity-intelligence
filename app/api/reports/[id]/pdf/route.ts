import { NextRequest, NextResponse } from 'next/server'
import { PDFGenerationService } from '@/lib/services/pdf-generation.service'
import { AppLogger } from '@/lib/observability/logger'
import { withAuth } from '@/lib/auth/auth-guard'
import { prisma } from '@/lib/database/prisma-client'
import { z } from 'zod'

/**
 * PDF Export API Route
 * AC: 5 - Professional PDF export with table of contents and Mercury.com branding
 * AC: 6 - Interactive elements become static in PDF format
 */

const pdfOptionsSchema = z.object({
  type: z.enum(['full', 'summary', 'opportunity']).default('full'),
  format: z.enum(['A4', 'Letter']).default('A4'),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  includeTableOfContents: z.boolean().default(true),
  includePageNumbers: z.boolean().default(true),
  quality: z.enum(['standard', 'high']).default('standard'),
  watermark: z.string().optional(),
  opportunityId: z.string().optional(),
  topOpportunities: z.number().min(1).max(20).default(5)
})

async function generatePDF(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reportId = params.id
    const searchParams = request.nextUrl.searchParams
    
    // Parse query parameters
    const options = pdfOptionsSchema.parse({
      type: searchParams.get('type') || 'full',
      format: searchParams.get('format') || 'A4',
      orientation: searchParams.get('orientation') || 'portrait',
      includeTableOfContents: searchParams.get('toc') === 'true',
      includePageNumbers: searchParams.get('pageNumbers') === 'true',
      quality: searchParams.get('quality') || 'standard',
      watermark: searchParams.get('watermark') || undefined,
      opportunityId: searchParams.get('opportunityId') || undefined,
      topOpportunities: parseInt(searchParams.get('topOpportunities') || '5')
    })

    AppLogger.info('Starting PDF export request', {
      service: 'pdf-export',
      operation: 'generate_pdf',
      metadata: {
        reportId,
        options,
        userAgent: request.headers.get('user-agent')
      }
    })

    // Fetch report with all related data
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        analysis: {
          include: {
            opportunities: {
              include: {
                sourcePost: true
              }
            }
          }
        }
      }
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Transform database report to EnhancedReport format
    const enhancedReport = await transformDatabaseReportToEnhanced(report)

    // Initialize PDF service
    const pdfService = new PDFGenerationService(report.analysisId)

    let pdfBuffer: Buffer
    let filename: string

    // Generate appropriate PDF based on type
    switch (options.type) {
      case 'full':
        pdfBuffer = await pdfService.generateReportPDF(enhancedReport, {
          includeTableOfContents: options.includeTableOfContents,
          includePageNumbers: options.includePageNumbers,
          format: options.format,
          orientation: options.orientation,
          quality: options.quality,
          watermark: options.watermark
        })
        filename = `saas-opportunities-report-${reportId.slice(0, 8)}.pdf`
        break

      case 'summary':
        pdfBuffer = await pdfService.generateSummaryPDF(enhancedReport, {
          includeTopOpportunities: options.topOpportunities,
          format: options.format
        })
        filename = `saas-opportunities-summary-${reportId.slice(0, 8)}.pdf`
        break

      case 'opportunity':
        if (!options.opportunityId) {
          return NextResponse.json(
            { error: 'opportunityId required for opportunity PDF type' },
            { status: 400 }
          )
        }
        pdfBuffer = await pdfService.generateOpportunityPDF(enhancedReport, options.opportunityId, {
          format: options.format
        })
        filename = `opportunity-${options.opportunityId.slice(0, 8)}.pdf`
        break

      default:
        return NextResponse.json(
          { error: 'Invalid PDF type' },
          { status: 400 }
        )
    }

    AppLogger.info('PDF generation completed', {
      service: 'pdf-export',
      operation: 'generate_pdf_completed',
      metadata: {
        reportId,
        pdfType: options.type,
        pdfSizeBytes: pdfBuffer.length,
        filename
      }
    })

    // Return PDF with appropriate headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    AppLogger.error('PDF generation failed', {
      service: 'pdf-export',
      operation: 'generate_pdf_error',
      metadata: {
        reportId: params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid parameters',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error during PDF generation' },
      { status: 500 }
    )
  }
}

async function transformDatabaseReportToEnhanced(dbReport: any): Promise<any> {
  // Transform database report structure to EnhancedReport format
  // This is a simplified transformation - in production you'd want more robust parsing
  
  const executiveSummary = typeof dbReport.executiveSummary === 'string' 
    ? JSON.parse(dbReport.executiveSummary)
    : dbReport.executiveSummary

  const enhancedOpportunities = typeof dbReport.enhancedOpportunities === 'string'
    ? JSON.parse(dbReport.enhancedOpportunities)
    : dbReport.enhancedOpportunities

  const marketAnalysis = typeof dbReport.marketAnalysis === 'string'
    ? JSON.parse(dbReport.marketAnalysis)
    : dbReport.marketAnalysis

  return {
    id: dbReport.id,
    analysisId: dbReport.analysisId,
    reportType: dbReport.reportType,
    template: {
      name: 'Enhanced Analysis Report',
      sections: [
        { type: 'executive-summary', included: true, order: 1 },
        { type: 'opportunities', included: true, order: 2 },
        { type: 'market-analysis', included: true, order: 3 },
        { type: 'methodology', included: true, order: 4 }
      ]
    },
    executiveSummary,
    opportunities: enhancedOpportunities,
    marketAnalysis,
    metadata: {
      generatedAt: dbReport.createdAt,
      accuracyConfidence: dbReport.accuracyConfidence || 0.8,
      processingTime: dbReport.processingTimeMs || 30000,
      totalCosts: dbReport.totalCost || 0,
      analysisConfiguration: {
        subreddits: dbReport.analysis?.configuration?.subreddits || ['entrepreneur', 'SaaS'],
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      },
      dataSourceSummary: {
        totalPosts: dbReport.analysis?.opportunities?.length || 0,
        totalComments: dbReport.analysis?.opportunities?.reduce((sum: number, opp: any) => 
          sum + (opp.sourcePost?.numComments || 0), 0) || 0,
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      }
    },
    privacy: {
      isPublic: dbReport.isPublic || false,
      allowSharing: dbReport.allowSharing || false,
      passwordProtected: !!dbReport.sharePassword,
      expiresAt: dbReport.expiresAt
    },
    createdAt: dbReport.createdAt,
    updatedAt: dbReport.updatedAt
  }
}

// Export with authentication
export const GET = withAuth(generatePDF)

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