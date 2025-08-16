import { prisma } from '@/lib/database/prisma-client'
import { AppLogger } from '@/lib/observability/logger'
import { z } from 'zod'

/**
 * Report Template Service for Customizable Report Layouts
 * AC: 9 - Customizable report templates with section ordering and branding options
 */

export interface ReportTemplate {
  id: string
  name: string
  description: string
  isDefault: boolean
  sections: TemplateSection[]
  branding: TemplateBranding
  formatting: TemplateFormatting
  createdBy: string
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TemplateSection {
  type: 'executive-summary' | 'opportunities' | 'market-analysis' | 'methodology' | 'technical-details' | 'financial-analysis' | 'custom'
  name: string
  description?: string
  included: boolean
  order: number
  settings: SectionSettings
}

export interface SectionSettings {
  showMetrics?: boolean
  maxItems?: number
  sortBy?: 'score' | 'date' | 'category' | 'custom'
  groupBy?: 'none' | 'category' | 'persona' | 'industry'
  customTitle?: string
  customContent?: string
  chartType?: 'bar' | 'pie' | 'line' | 'table'
  expandByDefault?: boolean
}

export interface TemplateBranding {
  primaryColor: string
  secondaryColor: string
  logoUrl?: string
  companyName?: string
  headerText?: string
  footerText?: string
  showDotPattern: boolean
  fontFamily: 'system' | 'serif' | 'mono'
}

export interface TemplateFormatting {
  pageSize: 'A4' | 'Letter' | 'Legal'
  orientation: 'portrait' | 'landscape'
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
  spacing: 'compact' | 'normal' | 'relaxed'
  showPageNumbers: boolean
  showTableOfContents: boolean
  headerHeight: number
  footerHeight: number
}

export interface CreateTemplateOptions {
  name: string
  description: string
  sections: TemplateSection[]
  branding: TemplateBranding
  formatting: TemplateFormatting
  isPublic?: boolean
  baseTemplateId?: string
}

export interface UpdateTemplateOptions {
  name?: string
  description?: string
  sections?: TemplateSection[]
  branding?: TemplateBranding
  formatting?: TemplateFormatting
  isPublic?: boolean
}

export class ReportTemplateService {
  /**
   * Get all available templates for a user
   */
  async getAvailableTemplates(userId: string): Promise<ReportTemplate[]> {
    try {
      AppLogger.info('Fetching available templates', {
        service: 'report-template',
        operation: 'get_available_templates',
        metadata: { userId }
      })

      const templates = await prisma.reportTemplate.findMany({
        where: {
          OR: [
            { createdByUserId: userId },
            { isPublic: true },
            { isDefault: true }
          ]
        },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' }
        ]
      })

      return templates.map(this.transformDatabaseTemplate)

    } catch (error) {
      AppLogger.error('Failed to fetch available templates', {
        service: 'report-template',
        operation: 'get_available_templates_error',
        metadata: {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      throw error
    }
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: string, userId: string): Promise<ReportTemplate | null> {
    try {
      const template = await prisma.reportTemplate.findFirst({
        where: {
          id: templateId,
          OR: [
            { createdByUserId: userId },
            { isPublic: true },
            { isDefault: true }
          ]
        }
      })

      return template ? this.transformDatabaseTemplate(template) : null

    } catch (error) {
      AppLogger.error('Failed to fetch template', {
        service: 'report-template',
        operation: 'get_template_error',
        metadata: {
          templateId,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      throw error
    }
  }

  /**
   * Create a new custom template
   */
  async createTemplate(userId: string, options: CreateTemplateOptions): Promise<ReportTemplate> {
    try {
      AppLogger.info('Creating new template', {
        service: 'report-template',
        operation: 'create_template',
        metadata: {
          userId,
          templateName: options.name,
          sectionsCount: options.sections.length
        }
      })

      // Validate template data
      this.validateTemplateData(options)

      const templateData = {
        name: options.name,
        description: options.description,
        createdByUserId: userId,
        isPublic: options.isPublic || false,
        isDefault: false,
        sections: JSON.stringify(options.sections),
        branding: JSON.stringify(options.branding),
        formatting: JSON.stringify(options.formatting),
        baseTemplateId: options.baseTemplateId
      }

      const template = await prisma.reportTemplate.create({
        data: templateData
      })

      AppLogger.info('Template created successfully', {
        service: 'report-template',
        operation: 'create_template_completed',
        metadata: {
          templateId: template.id,
          templateName: template.name
        }
      })

      return this.transformDatabaseTemplate(template)

    } catch (error) {
      AppLogger.error('Failed to create template', {
        service: 'report-template',
        operation: 'create_template_error',
        metadata: {
          userId,
          templateName: options.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      throw error
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    templateId: string,
    userId: string,
    options: UpdateTemplateOptions
  ): Promise<ReportTemplate> {
    try {
      // Verify user owns the template
      const existingTemplate = await prisma.reportTemplate.findFirst({
        where: {
          id: templateId,
          createdByUserId: userId
        }
      })

      if (!existingTemplate) {
        throw new Error('Template not found or access denied')
      }

      const updateData: any = {}
      
      if (options.name) updateData.name = options.name
      if (options.description) updateData.description = options.description
      if (options.sections) updateData.sections = JSON.stringify(options.sections)
      if (options.branding) updateData.branding = JSON.stringify(options.branding)
      if (options.formatting) updateData.formatting = JSON.stringify(options.formatting)
      if (options.isPublic !== undefined) updateData.isPublic = options.isPublic

      const template = await prisma.reportTemplate.update({
        where: { id: templateId },
        data: updateData
      })

      AppLogger.info('Template updated successfully', {
        service: 'report-template',
        operation: 'update_template_completed',
        metadata: {
          templateId,
          templateName: template.name
        }
      })

      return this.transformDatabaseTemplate(template)

    } catch (error) {
      AppLogger.error('Failed to update template', {
        service: 'report-template',
        operation: 'update_template_error',
        metadata: {
          templateId,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      throw error
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    try {
      const template = await prisma.reportTemplate.findFirst({
        where: {
          id: templateId,
          createdByUserId: userId,
          isDefault: false // Prevent deletion of default templates
        }
      })

      if (!template) {
        throw new Error('Template not found or cannot be deleted')
      }

      await prisma.reportTemplate.delete({
        where: { id: templateId }
      })

      AppLogger.info('Template deleted successfully', {
        service: 'report-template',
        operation: 'delete_template_completed',
        metadata: {
          templateId,
          templateName: template.name
        }
      })

    } catch (error) {
      AppLogger.error('Failed to delete template', {
        service: 'report-template',
        operation: 'delete_template_error',
        metadata: {
          templateId,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      throw error
    }
  }

  /**
   * Clone an existing template
   */
  async cloneTemplate(
    sourceTemplateId: string,
    userId: string,
    name: string,
    description?: string
  ): Promise<ReportTemplate> {
    try {
      const sourceTemplate = await this.getTemplate(sourceTemplateId, userId)
      
      if (!sourceTemplate) {
        throw new Error('Source template not found')
      }

      const cloneOptions: CreateTemplateOptions = {
        name,
        description: description || `Copy of ${sourceTemplate.name}`,
        sections: sourceTemplate.sections,
        branding: sourceTemplate.branding,
        formatting: sourceTemplate.formatting,
        isPublic: false,
        baseTemplateId: sourceTemplateId
      }

      return await this.createTemplate(userId, cloneOptions)

    } catch (error) {
      AppLogger.error('Failed to clone template', {
        service: 'report-template',
        operation: 'clone_template_error',
        metadata: {
          sourceTemplateId,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      throw error
    }
  }

  /**
   * Get default templates
   */
  async getDefaultTemplates(): Promise<ReportTemplate[]> {
    try {
      const templates = await prisma.reportTemplate.findMany({
        where: { isDefault: true },
        orderBy: { name: 'asc' }
      })

      return templates.map(this.transformDatabaseTemplate)

    } catch (error) {
      AppLogger.error('Failed to fetch default templates', {
        service: 'report-template',
        operation: 'get_default_templates_error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      throw error
    }
  }

  /**
   * Initialize default templates if they don't exist
   */
  async initializeDefaultTemplates(): Promise<void> {
    try {
      const existingDefaults = await prisma.reportTemplate.count({
        where: { isDefault: true }
      })

      if (existingDefaults > 0) {
        return // Default templates already exist
      }

      AppLogger.info('Initializing default templates', {
        service: 'report-template',
        operation: 'initialize_defaults'
      })

      const defaultTemplates = this.getDefaultTemplateConfigurations()

      for (const template of defaultTemplates) {
        await prisma.reportTemplate.create({
          data: {
            name: template.name,
            description: template.description,
            isDefault: true,
            isPublic: true,
            createdByUserId: 'system',
            sections: JSON.stringify(template.sections),
            branding: JSON.stringify(template.branding),
            formatting: JSON.stringify(template.formatting)
          }
        })
      }

      AppLogger.info('Default templates initialized successfully', {
        service: 'report-template',
        operation: 'initialize_defaults_completed',
        metadata: {
          templatesCreated: defaultTemplates.length
        }
      })

    } catch (error) {
      AppLogger.error('Failed to initialize default templates', {
        service: 'report-template',
        operation: 'initialize_defaults_error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      throw error
    }
  }

  // Private helper methods

  private transformDatabaseTemplate(dbTemplate: any): ReportTemplate {
    return {
      id: dbTemplate.id,
      name: dbTemplate.name,
      description: dbTemplate.description,
      isDefault: dbTemplate.isDefault,
      sections: typeof dbTemplate.sections === 'string' 
        ? JSON.parse(dbTemplate.sections) 
        : dbTemplate.sections,
      branding: typeof dbTemplate.branding === 'string' 
        ? JSON.parse(dbTemplate.branding) 
        : dbTemplate.branding,
      formatting: typeof dbTemplate.formatting === 'string' 
        ? JSON.parse(dbTemplate.formatting) 
        : dbTemplate.formatting,
      createdBy: dbTemplate.createdByUserId,
      isPublic: dbTemplate.isPublic,
      createdAt: dbTemplate.createdAt,
      updatedAt: dbTemplate.updatedAt
    }
  }

  private validateTemplateData(options: CreateTemplateOptions): void {
    if (!options.name || options.name.trim().length === 0) {
      throw new Error('Template name is required')
    }

    if (options.sections.length === 0) {
      throw new Error('Template must have at least one section')
    }

    // Validate section order uniqueness
    const orders = options.sections.map(s => s.order)
    const uniqueOrders = new Set(orders)
    if (orders.length !== uniqueOrders.size) {
      throw new Error('Section orders must be unique')
    }

    // Validate required sections
    const hasExecutiveSummary = options.sections.some(s => s.type === 'executive-summary')
    if (!hasExecutiveSummary) {
      throw new Error('Template must include an executive summary section')
    }
  }

  private getDefaultTemplateConfigurations(): CreateTemplateOptions[] {
    return [
      {
        name: 'Standard Analysis Report',
        description: 'Comprehensive report with all analysis sections',
        sections: [
          {
            type: 'executive-summary',
            name: 'Executive Summary',
            description: 'Key insights and recommendations',
            included: true,
            order: 1,
            settings: { showMetrics: true }
          },
          {
            type: 'opportunities',
            name: 'SaaS Opportunities',
            description: 'Detailed opportunity analysis',
            included: true,
            order: 2,
            settings: { sortBy: 'score', maxItems: 50, expandByDefault: false }
          },
          {
            type: 'market-analysis',
            name: 'Market Analysis',
            description: 'Market trends and persona insights',
            included: true,
            order: 3,
            settings: { chartType: 'bar', showMetrics: true }
          },
          {
            type: 'methodology',
            name: 'Methodology',
            description: 'Analysis process and data sources',
            included: true,
            order: 4,
            settings: {}
          }
        ],
        branding: {
          primaryColor: '#3b82f6',
          secondaryColor: '#6366f1',
          companyName: 'SaaS Opportunity Intelligence',
          showDotPattern: true,
          fontFamily: 'system'
        },
        formatting: {
          pageSize: 'A4',
          orientation: 'portrait',
          margins: { top: 72, right: 54, bottom: 72, left: 54 },
          spacing: 'normal',
          showPageNumbers: true,
          showTableOfContents: true,
          headerHeight: 60,
          footerHeight: 40
        },
        isPublic: true
      },
      {
        name: 'Executive Summary Only',
        description: 'Concise overview for quick decision making',
        sections: [
          {
            type: 'executive-summary',
            name: 'Executive Summary',
            description: 'Key insights and top opportunities',
            included: true,
            order: 1,
            settings: { showMetrics: true }
          },
          {
            type: 'opportunities',
            name: 'Top Opportunities',
            description: 'Highest scoring opportunities only',
            included: true,
            order: 2,
            settings: { sortBy: 'score', maxItems: 10, expandByDefault: true }
          }
        ],
        branding: {
          primaryColor: '#059669',
          secondaryColor: '#0d9488',
          companyName: 'SaaS Opportunity Intelligence',
          showDotPattern: false,
          fontFamily: 'system'
        },
        formatting: {
          pageSize: 'A4',
          orientation: 'portrait',
          margins: { top: 54, right: 54, bottom: 54, left: 54 },
          spacing: 'compact',
          showPageNumbers: false,
          showTableOfContents: false,
          headerHeight: 40,
          footerHeight: 30
        },
        isPublic: true
      },
      {
        name: 'Technical Deep-Dive',
        description: 'Detailed technical analysis for development teams',
        sections: [
          {
            type: 'executive-summary',
            name: 'Technical Overview',
            description: 'Key technical insights',
            included: true,
            order: 1,
            settings: { showMetrics: true }
          },
          {
            type: 'opportunities',
            name: 'Technical Opportunities',
            description: 'Development-focused opportunity analysis',
            included: true,
            order: 2,
            settings: { sortBy: 'score', groupBy: 'category', expandByDefault: true }
          },
          {
            type: 'technical-details',
            name: 'Implementation Analysis',
            description: 'Technical requirements and complexity',
            included: true,
            order: 3,
            settings: { chartType: 'table' }
          },
          {
            type: 'methodology',
            name: 'Technical Methodology',
            description: 'Analysis approach and validation',
            included: true,
            order: 4,
            settings: {}
          }
        ],
        branding: {
          primaryColor: '#7c3aed',
          secondaryColor: '#8b5cf6',
          companyName: 'SaaS Opportunity Intelligence',
          showDotPattern: true,
          fontFamily: 'mono'
        },
        formatting: {
          pageSize: 'A4',
          orientation: 'portrait',
          margins: { top: 72, right: 54, bottom: 72, left: 54 },
          spacing: 'relaxed',
          showPageNumbers: true,
          showTableOfContents: true,
          headerHeight: 60,
          footerHeight: 40
        },
        isPublic: true
      }
    ]
  }
}