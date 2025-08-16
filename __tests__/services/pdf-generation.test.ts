import { PDFGenerationService } from '@/lib/services/pdf-generation.service'
import { EnhancedReport } from '@/lib/types/report'

/**
 * Tests for PDF Generation Service
 * AC: 6, 7 - Comprehensive testing for PDF export functionality
 */

// Mock dependencies
jest.mock('@/lib/services/cost-tracking.service')
jest.mock('@/lib/observability/logger')
jest.mock('puppeteer', () => ({
  launch: jest.fn()
}))

describe('PDFGenerationService', () => {
  let service: PDFGenerationService
  let mockBrowser: any
  let mockPage: any

  beforeEach(() => {
    service = new PDFGenerationService('test-analysis-id', true) // Skip cost tracking
    
    // Mock Puppeteer browser and page
    mockPage = {
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
      close: jest.fn().mockResolvedValue(undefined)
    }
    
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined)
    }
    
    const mockPuppeteer = require('puppeteer')
    mockPuppeteer.launch.mockResolvedValue(mockBrowser)
    
    jest.clearAllMocks()
  })

  const createMockReport = (): EnhancedReport => ({
    id: 'test-report-1',
    analysisId: 'test-analysis-1',
    reportType: 'standard',
    template: {
      name: 'Standard Analysis Report',
      sections: [
        { type: 'executive-summary', included: true, order: 1 },
        { type: 'opportunities', included: true, order: 2 },
        { type: 'market-analysis', included: true, order: 3 },
        { type: 'methodology', included: true, order: 4 }
      ]
    },
    executiveSummary: {
      totalOpportunities: 5,
      averageOpportunityScore: 75,
      highestScoringOpportunity: 'Test Opportunity 1',
      topPersonas: [
        { persona: 'business-owner', count: 3, averageScore: 80, topProblems: [] }
      ],
      marketSizeDistribution: [
        { range: 'Medium ($100K-$1M)', count: 3, percentage: 60 }
      ],
      recommendedActions: [
        'Focus on high-scoring opportunities',
        'Target business-owner persona'
      ],
      keyFindings: [
        'Strong market demand for SaaS solutions',
        'High confidence in opportunity scoring'
      ],
      processingMetrics: {
        analysisTimeMs: 30000,
        totalCost: 5.50,
        confidenceLevel: 0.85
      }
    },
    opportunities: [
      {
        id: 'opp-1',
        title: 'Project Management Solution',
        problemStatement: 'Small businesses struggle with project tracking',
        opportunityScore: 85,
        confidenceScore: 80,
        urgencyScore: 75,
        marketSignalsScore: 78,
        feasibilityScore: 82,
        classification: 'saas_feasible',
        evidence: ['User explicitly describes pain point'],
        revenueEstimate: {
          annualRevenueMin: 50000,
          annualRevenueMax: 200000,
          pricingModel: 'subscription',
          marketSizeIndicator: 'medium',
          confidence: 0.8,
          reasoning: 'Based on market analysis',
          pricingRecommendation: {
            pricePoint: '$99/month',
            pricingTier: 'professional',
            justification: 'Value-based pricing'
          }
        },
        technicalAssessment: {
          implementationComplexity: 6,
          developmentTimeEstimate: '4-6 months',
          coreFeatures: [
            {
              name: 'Project Dashboard',
              priority: 'high',
              complexity: 5,
              description: 'Central project overview',
              estimatedDevelopmentTime: '2 months'
            }
          ],
          technicalRisks: ['Integration complexity'],
          scalabilityFactors: ['Cloud architecture'],
          integrationRequirements: ['Third-party APIs'],
          dataRequirements: ['Project data'],
          securityConsiderations: ['User authentication'],
          maintenanceComplexity: 4
        },
        suggestedSolution: {
          productName: 'ProjectMaster Pro',
          tagline: 'Streamlined project management for small businesses',
          coreFeatures: ['Task management', 'Team collaboration', 'Time tracking'],
          differentiationStrategy: 'Focus on simplicity and small business needs',
          targetMarket: {
            primaryPersona: 'business-owner',
            marketSegment: 'small-business'
          },
          implementationRoadmap: [
            {
              phase: 'MVP Development',
              description: 'Core features',
              duration: '3 months',
              deliverables: ['Basic project management'],
              dependencies: ['Technical setup'],
              risksAndMitigation: ['Scope creep - maintain MVP focus']
            }
          ],
          competitiveAdvantage: ['Simple interface', 'Industry focus'],
          potentialChallenges: ['Market competition', 'User adoption']
        },
        implementationComplexity: 6,
        marketEvidence: ['Strong user demand', 'Multiple pain points identified'],
        dimensionalAnalysis: {
          persona: { value: 'business-owner', confidence: 0.9, score: 8 },
          industryVertical: { value: 'general-business', confidence: 0.8, score: 7 },
          userRole: { value: 'owner', confidence: 0.85, score: 8 },
          workflowStage: { value: 'planning', confidence: 0.7, score: 7 },
          emotionLevel: { score: 7, confidence: 0.8, reasoning: 'Moderate frustration' },
          urgencyLevel: { score: 8, confidence: 0.9, reasoning: 'Immediate need' },
          budgetContext: { score: 6, confidence: 0.7, reasoning: 'Small business budget' },
          technicalComplexity: { score: 5, confidence: 0.8, reasoning: 'Standard web app' },
          marketSize: { score: 7, confidence: 0.8, reasoning: 'Large addressable market' },
          existingSolutions: { score: 4, confidence: 0.9, reasoning: 'Few targeted solutions' },
          compositeScore: 75,
          qualityScore: 0.85,
          confidence: 0.82
        },
        sourcePost: {
          id: 'post-1',
          title: 'Project Management Issues',
          subreddit: 'entrepreneur',
          score: 150,
          numComments: 45,
          url: 'https://reddit.com/test',
          createdUtc: new Date('2024-01-01')
        }
      }
    ],
    marketAnalysis: {
      marketMaturity: 'growing',
      trendingTopics: [
        {
          topic: 'project management',
          frequency: 25,
          score: 85,
          growth: 15,
          relatedKeywords: ['tasks', 'teams', 'tracking']
        }
      ],
      personaDistribution: [
        {
          persona: 'business-owner',
          count: 3,
          percentage: 60,
          avgScore: 80,
          topIndustries: ['technology', 'consulting']
        }
      ],
      industryVerticals: [
        {
          vertical: 'technology',
          count: 2,
          percentage: 40,
          avgScore: 82,
          maturity: 'growing',
          growth: 20
        }
      ],
      problemFrequency: [
        {
          problemCategory: 'Task Management',
          frequency: 15,
          intensity: 8,
          trendDirection: 'increasing'
        }
      ],
      seasonalPatterns: [
        {
          period: 'Q1',
          description: 'Planning season drives demand',
          intensity: 7,
          confidence: 0.8
        }
      ],
      competitiveInsights: [
        'Market shows strong growth potential',
        'Limited specialized solutions for small businesses'
      ]
    },
    metadata: {
      generatedAt: new Date('2024-01-15'),
      accuracyConfidence: 0.85,
      processingTime: 30000,
      totalCosts: 5.50,
      analysisConfiguration: {
        subreddits: ['entrepreneur', 'smallbusiness'],
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-15')
        }
      },
      dataSourceSummary: {
        totalPosts: 100,
        totalComments: 500,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-15')
        }
      }
    },
    privacy: {
      isPublic: false,
      allowSharing: true,
      passwordProtected: false,
      expiresAt: null
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  })

  describe('generateReportPDF', () => {
    it('should generate full report PDF successfully', async () => {
      const mockReport = createMockReport()
      const options = {
        includeTableOfContents: true,
        includePageNumbers: true,
        format: 'A4' as const,
        orientation: 'portrait' as const,
        quality: 'standard' as const
      }

      const result = await service.generateReportPDF(mockReport, options)

      expect(result).toBeInstanceOf(Buffer)
      expect(result.toString()).toBe('mock-pdf-content')

      // Verify Puppeteer was called correctly
      expect(mockBrowser.newPage).toHaveBeenCalled()
      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('<!DOCTYPE html>'),
        { waitUntil: 'networkidle0' }
      )
      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'A4',
          orientation: 'portrait',
          printBackground: true,
          displayHeaderFooter: true
        })
      )
      expect(mockPage.close).toHaveBeenCalled()
      expect(mockBrowser.close).toHaveBeenCalled()
    })

    it('should handle custom page formatting options', async () => {
      const mockReport = createMockReport()
      const options = {
        format: 'Letter' as const,
        orientation: 'landscape' as const,
        quality: 'high' as const,
        includeTableOfContents: false,
        includePageNumbers: false
      }

      await service.generateReportPDF(mockReport, options)

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'Letter',
          orientation: 'landscape',
          displayHeaderFooter: false
        })
      )
    })

    it('should generate correct HTML structure', async () => {
      const mockReport = createMockReport()
      
      await service.generateReportPDF(mockReport, {})

      const [htmlContent] = mockPage.setContent.mock.calls[0]
      
      // Verify HTML structure
      expect(htmlContent).toContain('<!DOCTYPE html>')
      expect(htmlContent).toContain('<title>SaaS Opportunity Report')
      expect(htmlContent).toContain('Executive Summary')
      expect(htmlContent).toContain('SaaS Opportunities (1)')
      expect(htmlContent).toContain('Market Analysis')
      expect(htmlContent).toContain('Methodology')
      
      // Verify opportunity data is included
      expect(htmlContent).toContain('Project Management Solution')
      expect(htmlContent).toContain('ProjectMaster Pro')
      expect(htmlContent).toContain('$50,000 - $200,000')
    })

    it('should handle PDF generation errors gracefully', async () => {
      mockPage.pdf.mockRejectedValue(new Error('PDF generation failed'))
      
      const mockReport = createMockReport()
      
      await expect(
        service.generateReportPDF(mockReport, {})
      ).rejects.toThrow('PDF generation failed')
      
      // Verify cleanup still happens
      expect(mockBrowser.close).toHaveBeenCalled()
    })

    it('should handle browser initialization failure', async () => {
      const mockPuppeteer = require('puppeteer')
      mockPuppeteer.launch.mockRejectedValue(new Error('Browser launch failed'))
      
      const mockReport = createMockReport()
      
      await expect(
        service.generateReportPDF(mockReport, {})
      ).rejects.toThrow('Browser launch failed')
    })
  })

  describe('generateSummaryPDF', () => {
    it('should generate summary PDF with limited opportunities', async () => {
      const mockReport = createMockReport()
      const options = {
        includeTopOpportunities: 3,
        format: 'A4' as const
      }

      const result = await service.generateSummaryPDF(mockReport, options)

      expect(result).toBeInstanceOf(Buffer)
      
      const [htmlContent] = mockPage.setContent.mock.calls[0]
      expect(htmlContent).toContain('SaaS Opportunity Summary')
      expect(htmlContent).toContain('Executive Summary')
      expect(htmlContent).toContain('Top Opportunities')
      
      // Should not contain full sections
      expect(htmlContent).not.toContain('Market Analysis')
      expect(htmlContent).not.toContain('Methodology')
    })

    it('should limit opportunities to specified count', async () => {
      const mockReport = createMockReport()
      // Add more opportunities to test limiting
      mockReport.opportunities.push({
        ...mockReport.opportunities[0],
        id: 'opp-2',
        title: 'Second Opportunity',
        opportunityScore: 70
      })
      
      const options = { includeTopOpportunities: 1 }
      
      await service.generateSummaryPDF(mockReport, options)
      
      const [htmlContent] = mockPage.setContent.mock.calls[0]
      expect(htmlContent).toContain('Project Management Solution')
      expect(htmlContent).not.toContain('Second Opportunity')
    })
  })

  describe('generateOpportunityPDF', () => {
    it('should generate single opportunity PDF', async () => {
      const mockReport = createMockReport()
      const opportunityId = 'opp-1'

      const result = await service.generateOpportunityPDF(mockReport, opportunityId)

      expect(result).toBeInstanceOf(Buffer)
      
      const [htmlContent] = mockPage.setContent.mock.calls[0]
      expect(htmlContent).toContain('Project Management Solution')
      expect(htmlContent).toContain('ProjectMaster Pro')
      expect(htmlContent).toContain('$99/month')
    })

    it('should throw error for non-existent opportunity', async () => {
      const mockReport = createMockReport()
      const invalidOpportunityId = 'non-existent'

      await expect(
        service.generateOpportunityPDF(mockReport, invalidOpportunityId)
      ).rejects.toThrow('Opportunity non-existent not found in report')
    })
  })

  describe('PDF styling and formatting', () => {
    it('should include Mercury.com branding styles', async () => {
      const mockReport = createMockReport()
      
      await service.generateReportPDF(mockReport, {})
      
      const [htmlContent] = mockPage.setContent.mock.calls[0]
      
      // Check for branding elements
      expect(htmlContent).toContain('SaaS Opportunity Intelligence')
      expect(htmlContent).toContain('dot-pattern')
      expect(htmlContent).toContain('#3b82f6') // Primary color
      
      // Check for typography classes
      expect(htmlContent).toContain('font-family')
      expect(htmlContent).toContain('page-break')
      expect(htmlContent).toContain('no-break')
    })

    it('should generate table of contents when requested', async () => {
      const mockReport = createMockReport()
      const options = { includeTableOfContents: true }
      
      await service.generateReportPDF(mockReport, options)
      
      const [htmlContent] = mockPage.setContent.mock.calls[0]
      expect(htmlContent).toContain('Table of Contents')
      expect(htmlContent).toContain('Executive Summary')
      expect(htmlContent).toContain('SaaS Opportunities')
      expect(htmlContent).toContain('Market Analysis')
    })

    it('should handle print-specific formatting', async () => {
      const mockReport = createMockReport()
      
      await service.generateReportPDF(mockReport, {})
      
      const [htmlContent] = mockPage.setContent.mock.calls[0]
      
      // Check for print-specific CSS
      expect(htmlContent).toContain('@media print')
      expect(htmlContent).toContain('page-break-before')
      expect(htmlContent).toContain('page-break-inside')
    })
  })

  describe('Performance and resource management', () => {
    it('should clean up resources on success', async () => {
      const mockReport = createMockReport()
      
      await service.generateReportPDF(mockReport, {})
      
      expect(mockPage.close).toHaveBeenCalled()
      expect(mockBrowser.close).toHaveBeenCalled()
    })

    it('should clean up resources on error', async () => {
      mockPage.setContent.mockRejectedValue(new Error('Content loading failed'))
      
      const mockReport = createMockReport()
      
      await expect(
        service.generateReportPDF(mockReport, {})
      ).rejects.toThrow('Content loading failed')
      
      expect(mockBrowser.close).toHaveBeenCalled()
    })

    it('should handle concurrent PDF generation', async () => {
      const mockReport = createMockReport()
      
      // Start multiple PDF generation tasks
      const promises = [
        service.generateReportPDF(mockReport, {}),
        service.generateSummaryPDF(mockReport, {}),
        service.generateOpportunityPDF(mockReport, 'opp-1')
      ]
      
      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(3)
      expect(results.every(r => r instanceof Buffer)).toBe(true)
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle empty opportunities list', async () => {
      const mockReport = createMockReport()
      mockReport.opportunities = []
      
      const result = await service.generateReportPDF(mockReport, {})
      
      expect(result).toBeInstanceOf(Buffer)
      
      const [htmlContent] = mockPage.setContent.mock.calls[0]
      expect(htmlContent).toContain('SaaS Opportunities (0)')
    })

    it('should handle missing market analysis', async () => {
      const mockReport = createMockReport()
      delete (mockReport as any).marketAnalysis
      
      const result = await service.generateReportPDF(mockReport, {})
      
      expect(result).toBeInstanceOf(Buffer)
    })

    it('should handle network timeouts gracefully', async () => {
      mockPage.setContent.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      )
      
      const mockReport = createMockReport()
      
      await expect(
        service.generateReportPDF(mockReport, {})
      ).rejects.toThrow('Network timeout')
      
      expect(mockBrowser.close).toHaveBeenCalled()
    })
  })
})