import { ReportEnhancementService } from '@/lib/services/report-enhancement.service'
import { DimensionalAnalysis } from '@/lib/types/dimensional-analysis'

/**
 * Tests for Report Enhancement Service
 * AC: 6, 7 - Comprehensive testing for report generation
 */

// Mock dependencies
jest.mock('@/lib/services/cost-tracking.service')
jest.mock('@/lib/observability/logger')
jest.mock('ai', () => ({
  generateObject: jest.fn()
}))

// Mock OpenAI SDK
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mocked-model')
}))

describe('ReportEnhancementService', () => {
  let service: ReportEnhancementService
  const mockGenerateObject = require('ai').generateObject

  beforeEach(() => {
    service = new ReportEnhancementService('test-analysis-id', true) // Skip cost tracking
    jest.clearAllMocks()
  })

  describe('generateExecutiveSummary', () => {
    const mockOpportunities = [
      {
        id: 'opp-1',
        title: 'Test Opportunity 1',
        opportunityScore: 85,
        scoringDimensions: JSON.stringify({
          persona: { value: 'business-owner', confidence: 0.9 },
          industryVertical: { value: 'technology', confidence: 0.8 },
          compositeScore: 85
        } as DimensionalAnalysis),
        problemStatement: 'Test problem statement'
      },
      {
        id: 'opp-2',
        title: 'Test Opportunity 2',
        opportunityScore: 72,
        scoringDimensions: JSON.stringify({
          persona: { value: 'developer', confidence: 0.85 },
          industryVertical: { value: 'finance', confidence: 0.7 },
          compositeScore: 72
        } as DimensionalAnalysis),
        problemStatement: 'Another test problem'
      }
    ]

    const mockAnalysisMetadata = {
      totalPosts: 100,
      totalComments: 500,
      processingTime: 30000,
      totalCost: 5.50,
      confidenceLevel: 0.85
    }

    it('should generate executive summary successfully', async () => {
      const mockAIResponse = {
        keyFindings: [
          'Strong market demand for SaaS solutions',
          'High confidence scores across opportunities'
        ],
        recommendedActions: [
          'Prioritize high-scoring opportunities',
          'Focus on business-owner persona'
        ],
        marketInsights: [
          'Technology sector shows most potential',
          'Developer tools gaining traction'
        ],
        riskFactors: [
          'Market competition in technology sector'
        ]
      }

      mockGenerateObject.mockResolvedValue(mockAIResponse)

      const result = await service.generateExecutiveSummary(mockOpportunities, mockAnalysisMetadata)

      expect(result).toMatchObject({
        totalOpportunities: 2,
        averageOpportunityScore: 79, // (85 + 72) / 2, rounded
        highestScoringOpportunity: 'Test Opportunity 1',
        processingMetrics: {
          analysisTimeMs: 30000,
          totalCost: 5.50,
          confidenceLevel: 0.85
        }
      })

      expect(result.keyFindings).toContain('Strong market demand for SaaS solutions')
      expect(result.recommendedActions).toContain('Prioritize high-scoring opportunities')
      expect(result.topPersonas).toBeDefined()
      expect(result.marketSizeDistribution).toBeDefined()
    })

    it('should handle AI generation failure gracefully', async () => {
      mockGenerateObject.mockRejectedValue(new Error('AI service unavailable'))

      const result = await service.generateExecutiveSummary(mockOpportunities, mockAnalysisMetadata)

      // Should return fallback summary
      expect(result).toMatchObject({
        totalOpportunities: 2,
        averageOpportunityScore: 79,
        highestScoringOpportunity: 'Test Opportunity 1',
        recommendedActions: ['Review individual opportunities for detailed insights'],
        keyFindings: ['Analysis completed with basic opportunity scoring']
      })
    })

    it('should validate input parameters', async () => {
      await expect(
        service.generateExecutiveSummary([], mockAnalysisMetadata)
      ).resolves.toMatchObject({
        totalOpportunities: 0,
        averageOpportunityScore: 0
      })
    })
  })

  describe('generateRevenueEstimate', () => {
    const mockOpportunity = {
      problemStatement: 'Small businesses need better project management tools',
      marketSignalsScore: 75,
      scoringDimensions: JSON.stringify({
        persona: { value: 'business-owner', confidence: 0.9 },
        industryVertical: { value: 'construction', confidence: 0.8 },
        marketSize: { score: 7 },
        budgetContext: { score: 8 },
        emotionLevel: { score: 6 },
        existingSolutions: { score: 4 }
      } as DimensionalAnalysis)
    }

    it('should generate revenue estimate successfully', async () => {
      const mockAIResponse = {
        annualRevenueMin: 50000,
        annualRevenueMax: 200000,
        pricingModel: 'subscription',
        marketSizeIndicator: 'medium',
        confidence: 0.8,
        reasoning: 'Based on market size and budget context',
        pricingRecommendation: {
          pricePoint: '$99-199/month',
          pricingTier: 'professional',
          justification: 'Aligns with business value and competitor pricing'
        }
      }

      mockGenerateObject.mockResolvedValue(mockAIResponse)

      const result = await service.generateRevenueEstimate(mockOpportunity)

      expect(result).toMatchObject({
        annualRevenueMin: 50000,
        annualRevenueMax: 200000,
        pricingModel: 'subscription',
        marketSizeIndicator: 'medium',
        confidence: 0.8
      })

      expect(result.competitivePricing).toBeDefined()
      expect(result.pricingRecommendation.pricePoint).toBe('$99-199/month')
    })

    it('should handle invalid scoring dimensions gracefully', async () => {
      const invalidOpportunity = {
        ...mockOpportunity,
        scoringDimensions: 'invalid-json'
      }

      const result = await service.generateRevenueEstimate(invalidOpportunity)

      // Should return fallback estimate
      expect(result).toMatchObject({
        annualRevenueMin: 10000,
        annualRevenueMax: 100000,
        pricingModel: 'subscription'
      })
    })
  })

  describe('generateTechnicalAssessment', () => {
    const mockOpportunity = {
      problemStatement: 'Need automated data processing pipeline',
      scoringDimensions: JSON.stringify({
        technicalComplexity: { score: 8 },
        persona: { value: 'developer', confidence: 0.9 },
        industryVertical: { value: 'technology', confidence: 0.8 },
        workflowStage: { value: 'data-processing', confidence: 0.7 }
      } as DimensionalAnalysis)
    }

    it('should generate technical assessment successfully', async () => {
      const mockAIResponse = {
        implementationComplexity: 7,
        developmentTimeEstimate: '6-9 months',
        coreFeatures: [
          {
            name: 'Data Pipeline Engine',
            priority: 'high',
            complexity: 8,
            description: 'Core processing engine',
            estimatedDevelopmentTime: '3 months'
          },
          {
            name: 'Monitoring Dashboard',
            priority: 'medium',
            complexity: 5,
            description: 'Real-time monitoring',
            estimatedDevelopmentTime: '2 months'
          }
        ],
        technicalRisks: [
          'High complexity data transformations',
          'Scalability challenges with large datasets'
        ],
        scalabilityFactors: [
          'Horizontal scaling architecture',
          'Efficient data caching strategy'
        ],
        integrationRequirements: [
          'Database connectors',
          'API integrations'
        ],
        dataRequirements: [
          'Structured data processing',
          'Real-time data streams'
        ],
        securityConsiderations: [
          'Data encryption at rest and in transit',
          'Access control and audit logging'
        ],
        maintenanceComplexity: 6
      }

      mockGenerateObject.mockResolvedValue(mockAIResponse)

      const result = await service.generateTechnicalAssessment(mockOpportunity)

      expect(result).toMatchObject({
        implementationComplexity: 7,
        developmentTimeEstimate: '6-9 months',
        maintenanceComplexity: 6
      })

      expect(result.coreFeatures).toHaveLength(2)
      expect(result.coreFeatures[0]).toMatchObject({
        name: 'Data Pipeline Engine',
        priority: 'high',
        complexity: 8
      })

      expect(result.technicalRisks).toContain('High complexity data transformations')
      expect(result.securityConsiderations).toContain('Data encryption at rest and in transit')
    })

    it('should return fallback assessment on AI failure', async () => {
      mockGenerateObject.mockRejectedValue(new Error('AI service error'))

      const result = await service.generateTechnicalAssessment(mockOpportunity)

      expect(result).toMatchObject({
        implementationComplexity: 5,
        developmentTimeEstimate: '3-6 months',
        maintenanceComplexity: 5
      })

      expect(result.coreFeatures).toHaveLength(1)
      expect(result.technicalRisks).toContain('Standard development risks')
    })
  })

  describe('generateSaasSolution', () => {
    const mockOpportunity = {
      problemStatement: 'Small teams need better collaboration tools',
      title: 'Team Collaboration Challenge',
      scoringDimensions: JSON.stringify({
        persona: { value: 'team-lead', confidence: 0.9 },
        industryVertical: { value: 'technology', confidence: 0.8 },
        userRole: { value: 'manager', confidence: 0.85 },
        workflowStage: { value: 'collaboration', confidence: 0.7 },
        emotionLevel: { score: 7 },
        budgetContext: { score: 6 }
      } as DimensionalAnalysis)
    }

    it('should generate SaaS solution successfully', async () => {
      const mockAIResponse = {
        productName: 'TeamSync Pro',
        tagline: 'Seamless collaboration for modern teams',
        coreFeatures: [
          'Real-time document collaboration',
          'Integrated video conferencing',
          'Task management and tracking',
          'File sharing and version control'
        ],
        differentiationStrategy: 'Focus on simplicity and seamless integration with existing tools',
        targetMarket: {
          primaryPersona: 'team-lead',
          marketSegment: 'small-to-medium-teams',
          geography: ['North America', 'Europe']
        },
        implementationRoadmap: [
          {
            phase: 'MVP Development',
            description: 'Core collaboration features',
            duration: '3 months',
            deliverables: ['Basic document sharing', 'Real-time editing'],
            dependencies: ['Technical architecture finalization'],
            risksAndMitigation: ['Scope creep - maintain MVP focus']
          },
          {
            phase: 'Beta Testing',
            description: 'User testing and feedback',
            duration: '2 months',
            deliverables: ['Beta version', 'User feedback analysis'],
            dependencies: ['MVP completion'],
            risksAndMitigation: ['Low user adoption - incentivize early users']
          }
        ],
        competitiveAdvantage: [
          'Superior user experience',
          'Better integration capabilities'
        ],
        potentialChallenges: [
          'Market saturation',
          'User acquisition costs'
        ]
      }

      mockGenerateObject.mockResolvedValue(mockAIResponse)

      const result = await service.generateSaasSolution(mockOpportunity)

      expect(result).toMatchObject({
        productName: 'TeamSync Pro',
        tagline: 'Seamless collaboration for modern teams'
      })

      expect(result.coreFeatures).toHaveLength(4)
      expect(result.coreFeatures).toContain('Real-time document collaboration')

      expect(result.implementationRoadmap).toHaveLength(2)
      expect(result.implementationRoadmap[0]).toMatchObject({
        phase: 'MVP Development',
        duration: '3 months'
      })

      expect(result.targetMarket.primaryPersona).toBe('team-lead')
      expect(result.competitiveAdvantage).toContain('Superior user experience')
    })

    it('should generate fallback solution on error', async () => {
      mockGenerateObject.mockRejectedValue(new Error('AI generation failed'))

      const result = await service.generateSaasSolution(mockOpportunity)

      expect(result.productName).toContain('Pro') // Based on title
      expect(result.tagline).toBe('Solving your business challenges')
      expect(result.coreFeatures).toHaveLength(4)
      expect(result.implementationRoadmap).toHaveLength(1)
    })
  })

  describe('enhanceOpportunity', () => {
    const mockBaseOpportunity = {
      id: 'test-opp-1',
      title: 'Test Opportunity',
      problemStatement: 'Need better project management',
      opportunityScore: 80,
      confidenceScore: 85,
      urgencyScore: 70,
      marketSignalsScore: 75,
      feasibilityScore: 82,
      classification: 'saas_feasible',
      evidence: ['User explicitly mentions pain point'],
      scoringDimensions: JSON.stringify({
        persona: { value: 'business-owner', confidence: 0.9 },
        industryVertical: { value: 'construction', confidence: 0.8 }
      } as DimensionalAnalysis),
      sourcePost: {
        id: 'post-1',
        title: 'Project Management Issues',
        subreddit: 'entrepreneur',
        score: 150,
        numComments: 45,
        url: 'https://reddit.com/test',
        createdUtc: new Date()
      }
    }

    it('should enhance opportunity with all AI insights', async () => {
      // Mock all AI generation calls
      mockGenerateObject
        .mockResolvedValueOnce({ // Revenue estimate
          annualRevenueMin: 50000,
          annualRevenueMax: 150000,
          pricingModel: 'subscription',
          marketSizeIndicator: 'medium',
          confidence: 0.8,
          reasoning: 'Market analysis',
          pricingRecommendation: {
            pricePoint: '$99/month',
            pricingTier: 'professional',
            justification: 'Value-based pricing'
          }
        })
        .mockResolvedValueOnce({ // Technical assessment
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
        })
        .mockResolvedValueOnce({ // SaaS solution
          productName: 'ProjectMaster Pro',
          tagline: 'Streamlined project management',
          coreFeatures: ['Task management', 'Team collaboration'],
          differentiationStrategy: 'Focus on construction industry',
          targetMarket: {
            primaryPersona: 'business-owner',
            marketSegment: 'construction'
          },
          implementationRoadmap: [
            {
              phase: 'Development',
              description: 'Core features',
              duration: '4 months',
              deliverables: ['MVP'],
              dependencies: [],
              risksAndMitigation: ['Timeline risks']
            }
          ],
          competitiveAdvantage: ['Industry focus'],
          potentialChallenges: ['Market adoption']
        })

      const result = await service.enhanceOpportunity(mockBaseOpportunity)

      expect(result).toMatchObject({
        id: 'test-opp-1',
        title: 'Test Opportunity',
        opportunityScore: 80,
        classification: 'saas_feasible'
      })

      expect(result.revenueEstimate).toMatchObject({
        annualRevenueMin: 50000,
        annualRevenueMax: 150000,
        pricingModel: 'subscription'
      })

      expect(result.technicalAssessment).toMatchObject({
        implementationComplexity: 6,
        developmentTimeEstimate: '4-6 months'
      })

      expect(result.suggestedSolution).toMatchObject({
        productName: 'ProjectMaster Pro',
        tagline: 'Streamlined project management'
      })

      expect(result.sourcePost).toMatchObject({
        id: 'post-1',
        subreddit: 'entrepreneur',
        score: 150
      })
    })

    it('should handle parallel AI generation failures gracefully', async () => {
      mockGenerateObject.mockRejectedValue(new Error('AI service unavailable'))

      await expect(
        service.enhanceOpportunity(mockBaseOpportunity)
      ).rejects.toThrow('AI service unavailable')
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle empty opportunity lists', async () => {
      const result = await service.generateExecutiveSummary([], {
        totalPosts: 0,
        totalComments: 0,
        processingTime: 1000,
        totalCost: 0,
        confidenceLevel: 0
      })

      expect(result.totalOpportunities).toBe(0)
      expect(result.averageOpportunityScore).toBe(0)
    })

    it('should handle malformed dimensional analysis', async () => {
      const opportunity = {
        problemStatement: 'Test problem',
        marketSignalsScore: 50,
        scoringDimensions: 'invalid-json'
      }

      const result = await service.generateRevenueEstimate(opportunity)
      
      // Should return fallback estimate
      expect(result.pricingModel).toBe('subscription')
      expect(result.annualRevenueMin).toBeGreaterThan(0)
    })

    it('should handle network timeouts gracefully', async () => {
      mockGenerateObject.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      )

      const opportunity = {
        problemStatement: 'Test problem',
        scoringDimensions: JSON.stringify({
          persona: { value: 'developer', confidence: 0.8 }
        })
      }

      const result = await service.generateTechnicalAssessment(opportunity)
      
      // Should return fallback assessment
      expect(result.implementationComplexity).toBe(5)
      expect(result.developmentTimeEstimate).toBe('3-6 months')
    })
  })
})