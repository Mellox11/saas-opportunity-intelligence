import { ReportTemplateService } from '@/lib/services/report-template.service'
import { PrismaClient } from '@prisma/client'

/**
 * Tests for Report Template Service
 * AC: 9 - Comprehensive testing for report template system
 */

// Mock dependencies
jest.mock('@prisma/client')
jest.mock('@/lib/observability/logger')

describe('ReportTemplateService', () => {
  let service: ReportTemplateService
  let mockPrisma: jest.Mocked<PrismaClient>

  beforeEach(() => {
    service = new ReportTemplateService()
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>
    
    // Mock the prisma property
    ;(service as any).prisma = mockPrisma
    
    // Mock Prisma methods
    mockPrisma.reportTemplate = {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn()
    } as any

    jest.clearAllMocks()
  })

  describe('createTemplate', () => {
    const mockTemplateData = {
      name: 'Custom Analysis Report',
      description: 'A customized template for detailed analysis',
      sections: [
        { type: 'executive-summary', included: true, order: 1 },
        { type: 'opportunities', included: true, order: 2 },
        { type: 'market-analysis', included: false, order: 3 },
        { type: 'methodology', included: true, order: 4 }
      ],
      branding: {
        primaryColor: '#3b82f6',
        logoUrl: 'https://example.com/logo.png',
        companyName: 'Custom Corp'
      },
      formatting: {
        fontSize: 'medium',
        includeTOC: true,
        includePageNumbers: true,
        includeWatermark: false
      }
    }

    it('should create custom template successfully', async () => {
      const mockCreatedTemplate = {
        id: 'template-1',
        userId: 'user-1',
        ...mockTemplateData,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.reportTemplate.create = jest.fn().mockResolvedValue(mockCreatedTemplate)

      const result = await service.createTemplate('user-1', mockTemplateData)

      expect(result).toMatchObject({
        id: 'template-1',
        name: 'Custom Analysis Report',
        description: 'A customized template for detailed analysis',
        isDefault: false
      })

      expect(mockPrisma.reportTemplate.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Custom Analysis Report',
          description: 'A customized template for detailed analysis',
          sections: mockTemplateData.sections,
          branding: mockTemplateData.branding,
          formatting: mockTemplateData.formatting,
          isDefault: false
        }
      })
    })

    it('should create template with minimal required data', async () => {
      const minimalTemplate = {
        name: 'Simple Template',
        sections: [
          { type: 'executive-summary', included: true, order: 1 },
          { type: 'opportunities', included: true, order: 2 }
        ]
      }

      const mockCreatedTemplate = {
        id: 'template-2',
        userId: 'user-1',
        ...minimalTemplate,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.reportTemplate.create = jest.fn().mockResolvedValue(mockCreatedTemplate)

      const result = await service.createTemplate('user-1', minimalTemplate)

      expect(result.name).toBe('Simple Template')
      expect(result.sections).toHaveLength(2)
    })

    it('should handle template creation errors', async () => {
      mockPrisma.reportTemplate.create = jest.fn().mockRejectedValue(new Error('Database error'))

      await expect(
        service.createTemplate('user-1', mockTemplateData)
      ).rejects.toThrow('Database error')
    })
  })

  describe('getTemplate', () => {
    const mockTemplate = {
      id: 'template-1',
      userId: 'user-1',
      name: 'My Custom Template',
      description: 'Custom template description',
      sections: [
        { type: 'executive-summary', included: true, order: 1 },
        { type: 'opportunities', included: true, order: 2 }
      ],
      branding: {
        primaryColor: '#3b82f6',
        companyName: 'Test Corp'
      },
      formatting: {
        fontSize: 'medium',
        includeTOC: true
      },
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('should retrieve user template successfully', async () => {
      mockPrisma.reportTemplate.findUnique = jest.fn().mockResolvedValue(mockTemplate)

      const result = await service.getTemplate('template-1', 'user-1')

      expect(result).toMatchObject({
        id: 'template-1',
        name: 'My Custom Template',
        description: 'Custom template description'
      })

      expect(mockPrisma.reportTemplate.findUnique).toHaveBeenCalledWith({
        where: { 
          id: 'template-1',
          userId: 'user-1'
        }
      })
    })

    it('should reject access to other user templates', async () => {
      mockPrisma.reportTemplate.findUnique = jest.fn().mockResolvedValue(null)

      await expect(
        service.getTemplate('template-1', 'other-user')
      ).rejects.toThrow('Template not found or access denied')
    })

    it('should handle non-existent template', async () => {
      mockPrisma.reportTemplate.findUnique = jest.fn().mockResolvedValue(null)

      await expect(
        service.getTemplate('non-existent', 'user-1')
      ).rejects.toThrow('Template not found or access denied')
    })
  })

  describe('updateTemplate', () => {
    const mockExistingTemplate = {
      id: 'template-1',
      userId: 'user-1',
      name: 'Original Template',
      sections: [
        { type: 'executive-summary', included: true, order: 1 }
      ],
      isDefault: false
    }

    const updateData = {
      name: 'Updated Template',
      description: 'Updated description',
      sections: [
        { type: 'executive-summary', included: true, order: 1 },
        { type: 'opportunities', included: true, order: 2 },
        { type: 'market-analysis', included: false, order: 3 }
      ],
      branding: {
        primaryColor: '#dc2626',
        companyName: 'Updated Corp'
      }
    }

    it('should update template successfully', async () => {
      mockPrisma.reportTemplate.findUnique = jest.fn().mockResolvedValue(mockExistingTemplate)
      mockPrisma.reportTemplate.update = jest.fn().mockResolvedValue({
        ...mockExistingTemplate,
        ...updateData,
        updatedAt: new Date()
      })

      const result = await service.updateTemplate('template-1', 'user-1', updateData)

      expect(result.name).toBe('Updated Template')
      expect(result.description).toBe('Updated description')
      expect(result.sections).toHaveLength(3)

      expect(mockPrisma.reportTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: {
          name: 'Updated Template',
          description: 'Updated description',
          sections: updateData.sections,
          branding: updateData.branding
        }
      })
    })

    it('should reject updates to other user templates', async () => {
      mockPrisma.reportTemplate.findUnique = jest.fn().mockResolvedValue(null)

      await expect(
        service.updateTemplate('template-1', 'other-user', updateData)
      ).rejects.toThrow('Template not found or access denied')
    })

    it('should handle partial updates', async () => {
      mockPrisma.reportTemplate.findUnique = jest.fn().mockResolvedValue(mockExistingTemplate)
      mockPrisma.reportTemplate.update = jest.fn().mockResolvedValue({
        ...mockExistingTemplate,
        name: 'Partially Updated',
        updatedAt: new Date()
      })

      const partialUpdate = { name: 'Partially Updated' }
      const result = await service.updateTemplate('template-1', 'user-1', partialUpdate)

      expect(result.name).toBe('Partially Updated')
      expect(mockPrisma.reportTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: { name: 'Partially Updated' }
      })
    })
  })

  describe('deleteTemplate', () => {
    const mockTemplate = {
      id: 'template-1',
      userId: 'user-1',
      isDefault: false
    }

    it('should delete custom template successfully', async () => {
      mockPrisma.reportTemplate.findUnique = jest.fn().mockResolvedValue(mockTemplate)
      mockPrisma.reportTemplate.delete = jest.fn().mockResolvedValue(mockTemplate)

      await service.deleteTemplate('template-1', 'user-1')

      expect(mockPrisma.reportTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'template-1' }
      })
    })

    it('should reject deletion of default templates', async () => {
      const defaultTemplate = {
        ...mockTemplate,
        isDefault: true
      }

      mockPrisma.reportTemplate.findUnique = jest.fn().mockResolvedValue(defaultTemplate)

      await expect(
        service.deleteTemplate('template-1', 'user-1')
      ).rejects.toThrow('Cannot delete default template')
    })

    it('should reject deletion by non-owners', async () => {
      mockPrisma.reportTemplate.findUnique = jest.fn().mockResolvedValue(null)

      await expect(
        service.deleteTemplate('template-1', 'other-user')
      ).rejects.toThrow('Template not found or access denied')
    })
  })

  describe('getUserTemplates', () => {
    it('should retrieve all user templates', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Standard Report',
          description: 'Standard analysis template',
          isDefault: true,
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15')
        },
        {
          id: 'template-2',
          name: 'Custom Report',
          description: 'Custom analysis template',
          isDefault: false,
          createdAt: new Date('2024-01-16'),
          updatedAt: new Date('2024-01-16')
        }
      ]

      mockPrisma.reportTemplate.findMany = jest.fn().mockResolvedValue(mockTemplates)

      const result = await service.getUserTemplates('user-1')

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Standard Report')
      expect(result[0].isDefault).toBe(true)
      expect(result[1].name).toBe('Custom Report')
      expect(result[1].isDefault).toBe(false)

      expect(mockPrisma.reportTemplate.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' }
        ]
      })
    })

    it('should return empty array for user with no templates', async () => {
      mockPrisma.reportTemplate.findMany = jest.fn().mockResolvedValue([])

      const result = await service.getUserTemplates('user-1')

      expect(result).toEqual([])
    })
  })

  describe('getDefaultTemplate', () => {
    it('should return standard default template', async () => {
      const result = await service.getDefaultTemplate()

      expect(result).toMatchObject({
        name: 'Standard Analysis Report',
        description: 'Comprehensive SaaS opportunity analysis with all sections',
        isDefault: true
      })

      expect(result.sections).toHaveLength(4)
      expect(result.sections[0]).toMatchObject({
        type: 'executive-summary',
        included: true,
        order: 1
      })

      expect(result.branding).toMatchObject({
        primaryColor: '#3b82f6',
        companyName: 'SaaS Opportunity Intelligence'
      })

      expect(result.formatting).toMatchObject({
        fontSize: 'medium',
        includeTOC: true,
        includePageNumbers: true,
        includeWatermark: true
      })
    })
  })

  describe('applyTemplate', () => {
    const mockTemplate = {
      id: 'template-1',
      name: 'Custom Template',
      sections: [
        { type: 'executive-summary', included: true, order: 1 },
        { type: 'opportunities', included: true, order: 2 },
        { type: 'market-analysis', included: false, order: 3 }
      ],
      branding: {
        primaryColor: '#dc2626',
        companyName: 'Custom Corp'
      },
      formatting: {
        fontSize: 'large',
        includeTOC: false,
        includePageNumbers: true,
        includeWatermark: false
      }
    }

    const mockReportData = {
      reportType: 'standard',
      executiveSummary: { totalOpportunities: 5 },
      opportunities: [{ id: 'opp-1' }, { id: 'opp-2' }],
      marketAnalysis: { marketMaturity: 'growing' },
      metadata: { generatedAt: new Date() }
    }

    it('should apply template to report data', async () => {
      const result = await service.applyTemplate(mockTemplate as any, mockReportData as any)

      expect(result.template).toMatchObject({
        name: 'Custom Template',
        sections: mockTemplate.sections
      })

      expect(result.filteredData).toBeDefined()
      expect(result.filteredData.executiveSummary).toBeDefined()
      expect(result.filteredData.opportunities).toBeDefined()
      expect(result.filteredData.marketAnalysis).toBeUndefined() // Excluded by template

      expect(result.styling).toMatchObject({
        branding: mockTemplate.branding,
        formatting: mockTemplate.formatting
      })
    })

    it('should handle template with all sections included', async () => {
      const allIncludedTemplate = {
        ...mockTemplate,
        sections: [
          { type: 'executive-summary', included: true, order: 1 },
          { type: 'opportunities', included: true, order: 2 },
          { type: 'market-analysis', included: true, order: 3 },
          { type: 'methodology', included: true, order: 4 }
        ]
      }

      const result = await service.applyTemplate(allIncludedTemplate as any, mockReportData as any)

      expect(result.filteredData.executiveSummary).toBeDefined()
      expect(result.filteredData.opportunities).toBeDefined()
      expect(result.filteredData.marketAnalysis).toBeDefined()
      expect(result.filteredData.metadata).toBeDefined()
    })

    it('should handle missing optional template properties', async () => {
      const minimalTemplate = {
        id: 'template-minimal',
        name: 'Minimal Template',
        sections: [
          { type: 'executive-summary', included: true, order: 1 }
        ]
      }

      const result = await service.applyTemplate(minimalTemplate as any, mockReportData as any)

      expect(result.template.name).toBe('Minimal Template')
      expect(result.styling.branding).toBeUndefined()
      expect(result.styling.formatting).toBeUndefined()
    })
  })

  describe('validateTemplate', () => {
    it('should validate correct template structure', async () => {
      const validTemplate = {
        name: 'Valid Template',
        sections: [
          { type: 'executive-summary', included: true, order: 1 },
          { type: 'opportunities', included: true, order: 2 }
        ]
      }

      const result = await service.validateTemplate(validTemplate)

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should reject template without name', async () => {
      const invalidTemplate = {
        sections: [
          { type: 'executive-summary', included: true, order: 1 }
        ]
      }

      const result = await service.validateTemplate(invalidTemplate as any)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Template name is required')
    })

    it('should reject template without sections', async () => {
      const invalidTemplate = {
        name: 'No Sections Template'
      }

      const result = await service.validateTemplate(invalidTemplate as any)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Template must have at least one section')
    })

    it('should reject template with invalid section types', async () => {
      const invalidTemplate = {
        name: 'Invalid Sections Template',
        sections: [
          { type: 'invalid-section', included: true, order: 1 }
        ]
      }

      const result = await service.validateTemplate(invalidTemplate as any)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid section type: invalid-section')
    })

    it('should reject template with duplicate section orders', async () => {
      const invalidTemplate = {
        name: 'Duplicate Orders Template',
        sections: [
          { type: 'executive-summary', included: true, order: 1 },
          { type: 'opportunities', included: true, order: 1 }
        ]
      }

      const result = await service.validateTemplate(invalidTemplate as any)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Duplicate section order: 1')
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle database connection errors', async () => {
      mockPrisma.reportTemplate.create = jest.fn().mockRejectedValue(new Error('Connection failed'))

      await expect(
        service.createTemplate('user-1', {
          name: 'Test Template',
          sections: [{ type: 'executive-summary', included: true, order: 1 }]
        })
      ).rejects.toThrow('Connection failed')
    })

    it('should handle malformed template data', async () => {
      const malformedTemplate = {
        name: 'Malformed Template',
        sections: 'invalid-sections-data'
      }

      const result = await service.validateTemplate(malformedTemplate as any)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle empty sections array', async () => {
      const emptyTemplate = {
        name: 'Empty Template',
        sections: []
      }

      const result = await service.validateTemplate(emptyTemplate)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Template must have at least one section')
    })
  })
})