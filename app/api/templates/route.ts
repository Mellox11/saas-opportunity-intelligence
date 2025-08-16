import { NextRequest, NextResponse } from 'next/server'
import { ReportTemplateService } from '@/lib/services/report-template.service'
import { AppLogger } from '@/lib/observability/logger'
import { withAuth } from '@/lib/auth/auth-guard'
import { z } from 'zod'

/**
 * Report Templates API Routes
 * AC: 9 - Customizable report templates with section ordering and branding options
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

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  audience: z.enum(['technical', 'business', 'investor']),
  description: z.string().max(500),
  sections: z.array(templateSectionSchema).min(1),
  styling: templateBrandingSchema,
  customizations: templateFormattingSchema,
  isPublic: z.boolean().default(false),
  baseTemplateId: z.string().optional()
})

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  audience: z.enum(['technical', 'business', 'investor']).optional(),
  description: z.string().max(500).optional(),
  sections: z.array(templateSectionSchema).min(1).optional(),
  styling: templateBrandingSchema.optional(),
  customizations: templateFormattingSchema.optional(),
  isPublic: z.boolean().optional()
})

const cloneTemplateSchema = z.object({
  sourceTemplateId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional()
})

async function getTemplates(request: NextRequest) {
  try {
    const userId = (request as any).user?.id

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    AppLogger.info('Fetching templates for user', {
      service: 'templates-api',
      operation: 'get_templates',
      metadata: { userId }
    })

    const templateService = new ReportTemplateService()
    const templates = await templateService.getAvailableTemplates(userId)

    return NextResponse.json({
      success: true,
      data: templates
    })

  } catch (error) {
    AppLogger.error('Failed to fetch templates', {
      service: 'templates-api',
      operation: 'get_templates_error',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

async function createTemplate(request: NextRequest) {
  try {
    const userId = (request as any).user?.id

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = createTemplateSchema.parse(body)

    AppLogger.info('Creating new template', {
      service: 'templates-api',
      operation: 'create_template',
      metadata: {
        userId,
        templateName: validatedData.name,
        sectionsCount: validatedData.sections.length
      }
    })

    const templateService = new ReportTemplateService()
    const template = await templateService.createTemplate(userId, validatedData)

    return NextResponse.json({
      success: true,
      data: template
    }, { status: 201 })

  } catch (error) {
    AppLogger.error('Failed to create template', {
      service: 'templates-api',
      operation: 'create_template_error',
      metadata: {
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
      { error: error instanceof Error ? error.message : 'Failed to create template' },
      { status: 500 }
    )
  }
}

async function cloneTemplate(request: NextRequest) {
  try {
    const userId = (request as any).user?.id

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    if (url.searchParams.get('action') !== 'clone') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = cloneTemplateSchema.parse(body)

    AppLogger.info('Cloning template', {
      service: 'templates-api',
      operation: 'clone_template',
      metadata: {
        userId,
        sourceTemplateId: validatedData.sourceTemplateId,
        newName: validatedData.name
      }
    })

    const templateService = new ReportTemplateService()
    const template = await templateService.cloneTemplate(
      validatedData.sourceTemplateId,
      userId,
      validatedData.name,
      validatedData.description
    )

    return NextResponse.json({
      success: true,
      data: template
    }, { status: 201 })

  } catch (error) {
    AppLogger.error('Failed to clone template', {
      service: 'templates-api',
      operation: 'clone_template_error',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid clone request data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clone template' },
      { status: 500 }
    )
  }
}

async function handlePost(request: NextRequest) {
  const url = new URL(request.url)
  const action = url.searchParams.get('action')

  if (action === 'clone') {
    return cloneTemplate(request)
  } else {
    return createTemplate(request)
  }
}

// Export with authentication
export const GET = withAuth(getTemplates)
export const POST = withAuth(handlePost)

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