import { NextRequest, NextResponse } from 'next/server'
import { ReportTemplateService } from '@/lib/services/report-template.service'
import { AppLogger } from '@/lib/observability/logger'
import { withAuth } from '@/lib/auth/auth-guard'
import { z } from 'zod'

/**
 * Individual Template Management API
 * AC: 9 - Template CRUD operations
 */

const sectionSettingsSchema = z.object({
  showMetrics: z.boolean().optional(),
  maxItems: z.number().min(1).max(100).optional(),
  sortBy: z.enum(['score', 'date', 'category', 'custom']).optional(),
  groupBy: z.enum(['none', 'category', 'persona', 'industry']).optional(),
  customTitle: z.string().optional(),
  customContent: z.string().optional(),
  chartType: z.enum(['bar', 'pie', 'line', 'table']).optional(),
  expandByDefault: z.boolean().optional()
})

const templateSectionSchema = z.object({
  type: z.enum(['executive-summary', 'opportunities', 'market-analysis', 'methodology', 'technical-details', 'financial-analysis', 'custom']),
  name: z.string().min(1),
  description: z.string().optional(),
  included: z.boolean(),
  order: z.number().min(1),
  settings: sectionSettingsSchema
})

const templateBrandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  logoUrl: z.string().url().optional(),
  companyName: z.string().optional(),
  headerText: z.string().optional(),
  footerText: z.string().optional(),
  showDotPattern: z.boolean(),
  fontFamily: z.enum(['system', 'serif', 'mono'])
})

const templateFormattingSchema = z.object({
  pageSize: z.enum(['A4', 'Letter', 'Legal']),
  orientation: z.enum(['portrait', 'landscape']),
  margins: z.object({
    top: z.number().min(18).max(144),
    right: z.number().min(18).max(144),
    bottom: z.number().min(18).max(144),
    left: z.number().min(18).max(144)
  }),
  spacing: z.enum(['compact', 'normal', 'relaxed']),
  showPageNumbers: z.boolean(),
  showTableOfContents: z.boolean(),
  headerHeight: z.number().min(20).max(120),
  footerHeight: z.number().min(20).max(120)
})

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  sections: z.array(templateSectionSchema).min(1).optional(),
  branding: templateBrandingSchema.optional(),
  formatting: templateFormattingSchema.optional(),
  isPublic: z.boolean().optional()
})

async function getTemplate(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const templateId = params.id
    const userId = (request as any).user?.id

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    AppLogger.info('Fetching template', {
      service: 'templates-api',
      operation: 'get_template',
      metadata: { templateId, userId }
    })

    const templateService = new ReportTemplateService()
    const template = await templateService.getTemplate(templateId, userId)

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: template
    })

  } catch (error) {
    AppLogger.error('Failed to fetch template', {
      service: 'templates-api',
      operation: 'get_template_error',
      metadata: {
        templateId: params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

async function updateTemplate(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const templateId = params.id
    const userId = (request as any).user?.id

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = updateTemplateSchema.parse(body)

    AppLogger.info('Updating template', {
      service: 'templates-api',
      operation: 'update_template',
      metadata: {
        templateId,
        userId,
        hasNameUpdate: !!validatedData.name,
        hasSectionsUpdate: !!validatedData.sections
      }
    })

    const templateService = new ReportTemplateService()
    const template = await templateService.updateTemplate(templateId, userId, validatedData)

    return NextResponse.json({
      success: true,
      data: template
    })

  } catch (error) {
    AppLogger.error('Failed to update template', {
      service: 'templates-api',
      operation: 'update_template_error',
      metadata: {
        templateId: params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid template data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update template' },
      { status: 500 }
    )
  }
}

async function deleteTemplate(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const templateId = params.id
    const userId = (request as any).user?.id

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    AppLogger.info('Deleting template', {
      service: 'templates-api',
      operation: 'delete_template',
      metadata: { templateId, userId }
    })

    const templateService = new ReportTemplateService()
    await templateService.deleteTemplate(templateId, userId)

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    })

  } catch (error) {
    AppLogger.error('Failed to delete template', {
      service: 'templates-api',
      operation: 'delete_template_error',
      metadata: {
        templateId: params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete template' },
      { status: 500 }
    )
  }
}

// Export with authentication
export const GET = withAuth(getTemplate)
export const PUT = withAuth(updateTemplate)
export const DELETE = withAuth(deleteTemplate)

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}