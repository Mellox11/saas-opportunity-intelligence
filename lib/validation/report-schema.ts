import { z } from 'zod'

/**
 * Zod schemas for Enhanced Report Generation validation
 * AC: 1 - Professional report layout validation
 * AC: 2 - Enhanced opportunity data validation
 */

// Revenue estimate schema
export const revenueEstimateSchema = z.object({
  annualRevenueMin: z.number().min(0),
  annualRevenueMax: z.number().min(0),
  pricingModel: z.enum(['subscription', 'one-time', 'freemium', 'usage-based', 'marketplace']),
  marketSizeIndicator: z.enum(['small', 'medium', 'large', 'enterprise']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(10),
  pricingRecommendation: z.object({
    pricePoint: z.string(),
    pricingTier: z.enum(['basic', 'professional', 'enterprise']),
    justification: z.string()
  }),
  competitivePricing: z.object({
    competitors: z.array(z.string()),
    averagePrice: z.number().min(0),
    pricePosition: z.enum(['low', 'mid', 'premium'])
  }).optional()
})

// Technical assessment schema
export const technicalAssessmentSchema = z.object({
  implementationComplexity: z.number().int().min(1).max(10),
  developmentTimeEstimate: z.string(),
  coreFeatures: z.array(z.object({
    name: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    complexity: z.number().int().min(1).max(10),
    description: z.string(),
    estimatedDevelopmentTime: z.string()
  })),
  technicalRisks: z.array(z.string()),
  scalabilityFactors: z.array(z.string()),
  integrationRequirements: z.array(z.string()),
  dataRequirements: z.array(z.string()),
  securityConsiderations: z.array(z.string()),
  maintenanceComplexity: z.number().int().min(1).max(10)
})

// Suggested solution schema
export const suggestedSolutionSchema = z.object({
  productName: z.string().min(1),
  tagline: z.string().min(1),
  coreFeatures: z.array(z.string()).min(1),
  differentiationStrategy: z.string().min(10),
  targetMarket: z.object({
    primaryPersona: z.string(),
    marketSegment: z.string(),
    geography: z.array(z.string()).optional()
  }),
  implementationRoadmap: z.array(z.object({
    phase: z.string(),
    description: z.string(),
    duration: z.string(),
    deliverables: z.array(z.string()),
    dependencies: z.array(z.string()),
    risksAndMitigation: z.array(z.string())
  })),
  competitiveAdvantage: z.array(z.string()),
  potentialChallenges: z.array(z.string())
})

// Enhanced opportunity schema
export const enhancedOpportunitySchema = z.object({
  // Base opportunity fields
  id: z.string(),
  title: z.string(),
  problemStatement: z.string(),
  opportunityScore: z.number().min(0).max(100),
  confidenceScore: z.number().min(0).max(1),
  urgencyScore: z.number().min(0).max(100),
  marketSignalsScore: z.number().min(0).max(100),
  feasibilityScore: z.number().min(0).max(100),
  classification: z.string(),
  evidence: z.array(z.string()),
  
  // Enhanced insights
  revenueEstimate: revenueEstimateSchema,
  technicalAssessment: technicalAssessmentSchema,
  suggestedSolution: suggestedSolutionSchema,
  implementationComplexity: z.number().int().min(1).max(10),
  marketEvidence: z.array(z.string()),
  
  // Source post information
  sourcePost: z.object({
    id: z.string(),
    title: z.string(),
    subreddit: z.string(),
    score: z.number(),
    numComments: z.number(),
    url: z.string(),
    createdUtc: z.date()
  })
})

// Executive summary schema
export const executiveSummarySchema = z.object({
  totalOpportunities: z.number().int().min(0),
  averageOpportunityScore: z.number().min(0).max(100),
  highestScoringOpportunity: z.string(),
  topPersonas: z.array(z.object({
    persona: z.string(),
    count: z.number().int().min(0),
    averageScore: z.number().min(0).max(100),
    topProblems: z.array(z.string())
  })),
  marketSizeDistribution: z.array(z.object({
    range: z.string(),
    count: z.number().int().min(0),
    percentage: z.number().min(0).max(100)
  })),
  recommendedActions: z.array(z.string()),
  keyFindings: z.array(z.string()),
  processingMetrics: z.object({
    analysisTimeMs: z.number().min(0),
    totalCost: z.number().min(0),
    confidenceLevel: z.number().min(0).max(1)
  })
})

// Market analysis schema
export const marketAnalysisSchema = z.object({
  trendingTopics: z.array(z.object({
    topic: z.string(),
    frequency: z.number().min(0),
    score: z.number().min(0).max(100),
    growth: z.number(),
    relatedKeywords: z.array(z.string())
  })),
  seasonalPatterns: z.array(z.object({
    period: z.string(),
    intensity: z.number().int().min(1).max(10),
    description: z.string(),
    confidence: z.number().min(0).max(1)
  })).optional(),
  personaDistribution: z.array(z.object({
    persona: z.string(),
    count: z.number().int().min(0),
    percentage: z.number().min(0).max(100),
    avgScore: z.number().min(0).max(100),
    topIndustries: z.array(z.string())
  })),
  industryVerticals: z.array(z.object({
    vertical: z.string(),
    count: z.number().int().min(0),
    percentage: z.number().min(0).max(100),
    avgScore: z.number().min(0).max(100),
    growth: z.number(),
    maturity: z.enum(['emerging', 'growing', 'mature'])
  })),
  competitiveInsights: z.array(z.string()),
  marketMaturity: z.enum(['emerging', 'growing', 'mature', 'declining']),
  problemFrequency: z.array(z.object({
    problemCategory: z.string(),
    frequency: z.number().min(0),
    intensity: z.number().min(0).max(10),
    trendDirection: z.enum(['increasing', 'stable', 'decreasing'])
  })),
  geographicDistribution: z.array(z.object({
    region: z.string(),
    count: z.number().int().min(0),
    percentage: z.number().min(0).max(100),
    avgScore: z.number().min(0).max(100)
  })).optional()
})

// Privacy settings schema
export const privacySettingsSchema = z.object({
  isPublic: z.boolean(),
  allowDownload: z.boolean(),
  allowSharing: z.boolean(),
  requirePassword: z.boolean(),
  allowedDomains: z.array(z.string()).optional(),
  expirationDays: z.number().int().min(1).max(365).optional(),
  trackingEnabled: z.boolean(),
  watermarkEnabled: z.boolean()
})

// Report metadata schema
export const reportMetadataSchema = z.object({
  analysisConfiguration: z.object({
    subreddits: z.array(z.string()),
    keywords: z.array(z.string()),
    timeRange: z.string(),
    filters: z.any()
  }),
  totalCosts: z.number().min(0),
  processingTime: z.number().min(0),
  accuracyConfidence: z.number().min(0).max(1),
  dataSourceSummary: z.object({
    totalPosts: z.number().int().min(0),
    totalComments: z.number().int().min(0),
    dateRange: z.object({
      start: z.date(),
      end: z.date()
    })
  }),
  versionInfo: z.object({
    reportVersion: z.string(),
    analysisVersion: z.string(),
    templateVersion: z.string()
  })
})

// Report template schema
export const reportTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  audience: z.enum(['technical', 'business', 'investor']),
  sections: z.array(z.object({
    id: z.string(),
    type: z.enum(['executive-summary', 'opportunities', 'market-analysis', 'methodology', 'appendix']),
    title: z.string(),
    included: z.boolean(),
    order: z.number().int().min(0),
    customContent: z.string().optional(),
    displayOptions: z.object({
      showCharts: z.boolean(),
      showDetails: z.boolean(),
      pageBreakBefore: z.boolean()
    })
  })),
  styling: z.object({
    colorScheme: z.enum(['light', 'dark', 'auto']),
    fontFamily: z.string(),
    fontSize: z.enum(['small', 'medium', 'large']),
    spacing: z.enum(['compact', 'normal', 'spacious']),
    brandingElements: z.object({
      includeLogo: z.boolean(),
      includeWatermark: z.boolean(),
      customColors: z.object({
        primary: z.string(),
        secondary: z.string(),
        accent: z.string()
      }).optional()
    })
  }),
  customizations: z.array(z.object({
    field: z.string(),
    value: z.any(),
    type: z.enum(['text', 'number', 'boolean', 'color', 'select']),
    label: z.string(),
    description: z.string().optional()
  })),
  version: z.string(),
  isDefault: z.boolean()
})

// Main enhanced report schema
export const enhancedReportSchema = z.object({
  id: z.string(),
  analysisId: z.string(),
  reportType: z.enum(['standard', 'technical', 'business', 'investor']),
  template: reportTemplateSchema,
  
  // Report sections
  executiveSummary: executiveSummarySchema,
  opportunities: z.array(enhancedOpportunitySchema),
  marketAnalysis: marketAnalysisSchema,
  metadata: reportMetadataSchema,
  
  // Sharing and privacy
  shareableLink: z.string().optional(),
  privacySettings: privacySettingsSchema,
  expirationDate: z.date().optional(),
  passwordProtected: z.boolean(),
  passwordHash: z.string().optional(),
  
  createdAt: z.date(),
  updatedAt: z.date()
})

// Report share schema
export const reportShareSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  shareToken: z.string().length(32),
  permissions: z.object({
    canView: z.boolean(),
    canDownload: z.boolean(),
    canShare: z.boolean()
  }),
  passwordHash: z.string().optional(),
  expiresAt: z.date().optional(),
  createdBy: z.string(),
  createdAt: z.date(),
  accessCount: z.number().int().min(0),
  lastAccessedAt: z.date().optional()
})

// Report analytics schema
export const reportAnalyticsSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  eventType: z.enum(['view', 'download', 'share', 'section_view', 'pdf_export']),
  sectionName: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  sessionId: z.string().optional(),
  duration: z.number().min(0).optional(),
  createdAt: z.date()
})

// PDF generation options schema
export const pdfGenerationOptionsSchema = z.object({
  theme: z.enum(['light', 'dark']),
  includeInteractiveTOC: z.boolean(),
  highResolution: z.boolean(),
  includeWatermark: z.boolean(),
  includePageNumbers: z.boolean(),
  format: z.enum(['A4', 'Letter', 'Legal']).default('A4'),
  margins: z.object({
    top: z.string().default('1in'),
    bottom: z.string().default('1in'),
    left: z.string().default('0.75in'),
    right: z.string().default('0.75in')
  }).optional()
})

// Report generation request schema
export const reportGenerationRequestSchema = z.object({
  analysisId: z.string(),
  reportType: z.enum(['standard', 'technical', 'business', 'investor']),
  templateId: z.string().optional(),
  customizations: z.array(z.object({
    field: z.string(),
    value: z.any()
  })).optional(),
  privacySettings: privacySettingsSchema.optional(),
  includeComments: z.boolean().default(true),
  includeDimensionalAnalysis: z.boolean().default(true)
})

// AI enhancement request schemas for report generation
export const aiRevenueEstimateRequestSchema = z.object({
  opportunityData: z.object({
    problemStatement: z.string(),
    marketSignals: z.number(),
    persona: z.string(),
    industryVertical: z.string(),
    dimensionalScores: z.object({
      marketSize: z.number(),
      budgetContext: z.number(),
      emotionLevel: z.number()
    })
  }),
  marketContext: z.object({
    competitorCount: z.number().optional(),
    marketMaturity: z.string().optional(),
    industryGrowth: z.number().optional()
  })
})

export const aiSolutionSuggestionRequestSchema = z.object({
  problemStatement: z.string(),
  technicalComplexity: z.number(),
  targetPersona: z.string(),
  industryVertical: z.string(),
  marketEvidence: z.array(z.string()),
  existingSolutions: z.number() // competition level
})

export const aiExecutiveSummaryRequestSchema = z.object({
  opportunities: z.array(z.object({
    title: z.string(),
    score: z.number(),
    persona: z.string(),
    industry: z.string(),
    problemStatement: z.string()
  })),
  analysisMetadata: z.object({
    totalPosts: z.number(),
    totalComments: z.number(),
    processingTime: z.number(),
    totalCost: z.number(),
    confidenceLevel: z.number()
  })
})

// Export types derived from schemas
export type EnhancedReport = z.infer<typeof enhancedReportSchema>
export type EnhancedOpportunity = z.infer<typeof enhancedOpportunitySchema>
export type ExecutiveSummary = z.infer<typeof executiveSummarySchema>
export type MarketAnalysis = z.infer<typeof marketAnalysisSchema>
export type RevenueEstimate = z.infer<typeof revenueEstimateSchema>
export type TechnicalAssessment = z.infer<typeof technicalAssessmentSchema>
export type SuggestedSolution = z.infer<typeof suggestedSolutionSchema>
export type ReportTemplate = z.infer<typeof reportTemplateSchema>
export type PrivacySettings = z.infer<typeof privacySettingsSchema>
export type ReportMetadata = z.infer<typeof reportMetadataSchema>
export type ReportShare = z.infer<typeof reportShareSchema>
export type ReportAnalytics = z.infer<typeof reportAnalyticsSchema>
export type PDFGenerationOptions = z.infer<typeof pdfGenerationOptionsSchema>
export type ReportGenerationRequest = z.infer<typeof reportGenerationRequestSchema>
export type AIRevenueEstimateRequest = z.infer<typeof aiRevenueEstimateRequestSchema>
export type AISolutionSuggestionRequest = z.infer<typeof aiSolutionSuggestionRequestSchema>
export type AIExecutiveSummaryRequest = z.infer<typeof aiExecutiveSummaryRequestSchema>