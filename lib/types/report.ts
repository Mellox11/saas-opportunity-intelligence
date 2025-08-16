/**
 * TypeScript interfaces for Enhanced Report Generation (Story 2.4)
 * AC: 1 - Professional report layout with executive summary, detailed opportunities, and market analysis sections
 * AC: 2 - Each opportunity includes: problem statement, market evidence, technical assessment, revenue potential estimates
 */

import { DimensionalAnalysis } from '@/lib/types/dimensional-analysis'
import { CommentAnalysisMetadata } from '@/lib/validation/reddit-schema'

// Main enhanced report structure
export interface EnhancedReport {
  id: string
  analysisId: string
  reportType: 'standard' | 'technical' | 'business' | 'investor'
  template: ReportTemplate
  
  // Report sections (AC: 1)
  executiveSummary: ExecutiveSummary
  opportunities: EnhancedOpportunity[]
  marketAnalysis: MarketAnalysis
  metadata: ReportMetadata
  
  // Sharing and privacy (AC: 8)
  shareableLink?: string
  privacySettings: PrivacySettings
  expirationDate?: Date
  passwordProtected: boolean
  passwordHash?: string
  
  createdAt: Date
  updatedAt: Date
}

// Enhanced opportunity with AI-generated insights (AC: 2)
export interface EnhancedOpportunity {
  // Base opportunity data from existing schema
  id: string
  title: string
  problemStatement: string
  opportunityScore: number
  confidenceScore: number
  urgencyScore: number
  marketSignalsScore: number
  feasibilityScore: number
  classification: string
  evidence: string[]
  
  // Enhanced insights (AI-generated) (AC: 2)
  revenueEstimate: RevenueEstimate
  technicalAssessment: TechnicalAssessment
  suggestedSolution: SuggestedSolution
  implementationComplexity: number // 1-10 scale
  marketEvidence: string[]
  
  // Dimensional data from Story 2.2
  dimensionalAnalysis: DimensionalAnalysis
  
  // Community insights from Story 2.1
  communityReaction?: CommentAnalysisSummary
  
  // Source post information
  sourcePost: {
    id: string
    title: string
    subreddit: string
    score: number
    numComments: number
    url: string
    createdUtc: Date
  }
}

// Executive summary section (AC: 1)
export interface ExecutiveSummary {
  totalOpportunities: number
  averageOpportunityScore: number
  highestScoringOpportunity: string
  topPersonas: PersonaSummary[]
  marketSizeDistribution: MarketSizeDistribution[]
  recommendedActions: string[]
  keyFindings: string[]
  processingMetrics: {
    analysisTimeMs: number
    totalCost: number
    confidenceLevel: number
  }
}

// Market analysis section (AC: 4)
export interface MarketAnalysis {
  trendingTopics: TrendingTopic[]
  seasonalPatterns?: SeasonalPattern[]
  personaDistribution: PersonaDistribution[]
  industryVerticals: IndustryVertical[]
  competitiveInsights: string[]
  marketMaturity: 'emerging' | 'growing' | 'mature' | 'declining'
  problemFrequency: ProblemFrequency[]
  geographicDistribution?: GeographicDistribution[]
}

// Revenue estimation (AC: 2)
export interface RevenueEstimate {
  annualRevenueMin: number
  annualRevenueMax: number
  pricingModel: 'subscription' | 'one-time' | 'freemium' | 'usage-based' | 'marketplace'
  marketSizeIndicator: 'small' | 'medium' | 'large' | 'enterprise'
  confidence: number // 0-1
  reasoning: string
  pricingRecommendation: {
    pricePoint: string
    pricingTier: 'basic' | 'professional' | 'enterprise'
    justification: string
  }
  competitivePricing?: {
    competitors: string[]
    averagePrice: number
    pricePosition: 'low' | 'mid' | 'premium'
  }
}

// Technical assessment (AC: 2)
export interface TechnicalAssessment {
  implementationComplexity: number // 1-10 scale
  developmentTimeEstimate: string // e.g., "3-6 months"
  coreFeatures: TechnicalFeature[]
  technicalRisks: string[]
  scalabilityFactors: string[]
  integrationRequirements: string[]
  dataRequirements: string[]
  securityConsiderations: string[]
  maintenanceComplexity: number // 1-10 scale
}

// Suggested SaaS solution (AC: 3)
export interface SuggestedSolution {
  productName: string
  tagline: string
  coreFeatures: string[]
  differentiationStrategy: string
  targetMarket: {
    primaryPersona: string
    marketSegment: string
    geography?: string[]
  }
  implementationRoadmap: ImplementationPhase[]
  competitiveAdvantage: string[]
  potentialChallenges: string[]
}

// Report template system (AC: 9)
export interface ReportTemplate {
  id: string
  name: string
  audience: 'technical' | 'business' | 'investor'
  sections: ReportSection[]
  styling: TemplateStyle
  customizations: TemplateCustomization[]
  version: string
  isDefault: boolean
}

// Privacy and sharing settings (AC: 8)
export interface PrivacySettings {
  isPublic: boolean
  allowDownload: boolean
  allowSharing: boolean
  requirePassword: boolean
  allowedDomains?: string[]
  expirationDays?: number
  trackingEnabled: boolean
  watermarkEnabled: boolean
}

// Report metadata (AC: 7)
export interface ReportMetadata {
  analysisConfiguration: {
    subreddits: string[]
    keywords: string[]
    timeRange: string
    filters: any
  }
  totalCosts: number
  processingTime: number
  accuracyConfidence: number
  dataSourceSummary: {
    totalPosts: number
    totalComments: number
    dateRange: {
      start: Date
      end: Date
    }
  }
  versionInfo: {
    reportVersion: string
    analysisVersion: string
    templateVersion: string
  }
}

// Supporting interfaces
export interface PersonaSummary {
  persona: string
  count: number
  averageScore: number
  topProblems: string[]
}

export interface MarketSizeDistribution {
  range: string // e.g., "Small ($10K-$100K)", "Medium ($100K-$1M)"
  count: number
  percentage: number
}

export interface TrendingTopic {
  topic: string
  frequency: number
  score: number
  growth: number // percentage change over time
  relatedKeywords: string[]
}

export interface SeasonalPattern {
  period: string // e.g., "Q4", "January", "Holiday Season"
  intensity: number // 1-10 scale
  description: string
  confidence: number
}

export interface PersonaDistribution {
  persona: string
  count: number
  percentage: number
  avgScore: number
  topIndustries: string[]
}

export interface IndustryVertical {
  vertical: string
  count: number
  percentage: number
  avgScore: number
  growth: number
  maturity: 'emerging' | 'growing' | 'mature'
}

export interface ProblemFrequency {
  problemCategory: string
  frequency: number
  intensity: number // average urgency/emotion level
  trendDirection: 'increasing' | 'stable' | 'decreasing'
}

export interface GeographicDistribution {
  region: string
  count: number
  percentage: number
  avgScore: number
}

export interface TechnicalFeature {
  name: string
  priority: 'high' | 'medium' | 'low'
  complexity: number // 1-10 scale
  description: string
  estimatedDevelopmentTime: string
}

export interface ImplementationPhase {
  phase: string
  description: string
  duration: string
  deliverables: string[]
  dependencies: string[]
  risksAndMitigation: string[]
}

export interface CommentAnalysisSummary {
  totalComments: number
  averageSentiment: number
  enthusiasmLevel: 'low' | 'medium' | 'high'
  validationSignals: {
    agreements: number
    disagreements: number
    alternativeSolutions: string[]
  }
  topSentiments: {
    positive: string[]
    negative: string[]
    neutral: string[]
  }
}

export interface ReportSection {
  id: string
  type: 'executive-summary' | 'opportunities' | 'market-analysis' | 'methodology' | 'appendix'
  title: string
  included: boolean
  order: number
  customContent?: string
  displayOptions: {
    showCharts: boolean
    showDetails: boolean
    pageBreakBefore: boolean
  }
}

export interface TemplateStyle {
  colorScheme: 'light' | 'dark' | 'auto'
  fontFamily: string
  fontSize: 'small' | 'medium' | 'large'
  spacing: 'compact' | 'normal' | 'spacious'
  brandingElements: {
    includeLogo: boolean
    includeWatermark: boolean
    customColors?: {
      primary: string
      secondary: string
      accent: string
    }
  }
}

export interface TemplateCustomization {
  field: string
  value: any
  type: 'text' | 'number' | 'boolean' | 'color' | 'select'
  label: string
  description?: string
}

// Report sharing model for database
export interface ReportShare {
  id: string
  reportId: string
  shareToken: string
  permissions: {
    canView: boolean
    canDownload: boolean
    canShare: boolean
  }
  passwordHash?: string
  expiresAt?: Date
  createdBy: string
  createdAt: Date
  accessCount: number
  lastAccessedAt?: Date
}

// Report analytics for tracking (AC: 10)
export interface ReportAnalytics {
  id: string
  reportId: string
  eventType: 'view' | 'download' | 'share' | 'section_view' | 'pdf_export'
  sectionName?: string
  userAgent?: string
  ipAddress?: string
  sessionId?: string
  duration?: number // for section views
  createdAt: Date
}

// Audience-specific template configurations (AC: 9)
export const TEMPLATE_CONFIGS = {
  technical: {
    emphasize: ['implementation-complexity', 'technical-assessment', 'feature-specifications'],
    deemphasize: ['revenue-estimates', 'market-analysis'],
    includeCode: true,
    includeArchitecture: true,
    includeTimelines: true
  },
  business: {
    emphasize: ['revenue-estimates', 'market-analysis', 'competitive-insights'],
    deemphasize: ['technical-implementation'],
    includeROI: true,
    includeMarketData: true,
    includeBusinessModel: true
  },
  investor: {
    emphasize: ['market-size', 'revenue-potential', 'scalability'],
    deemphasize: ['technical-details'],
    includeFinancials: true,
    includeRiskAssessment: true,
    includeCompetitiveAnalysis: true
  }
} as const

// Report branding and styling constants (AC: 5)
export const REPORT_BRANDING = {
  dotGridPattern: {
    size: 20,
    opacity: 0.1,
    color: 'currentColor'
  },
  typography: {
    h1: 'text-3xl font-bold text-gray-900 dark:text-gray-100',
    h2: 'text-2xl font-semibold text-gray-800 dark:text-gray-200',
    h3: 'text-xl font-medium text-gray-800 dark:text-gray-200',
    body: 'text-base text-gray-700 dark:text-gray-300',
    caption: 'text-sm text-gray-600 dark:text-gray-400',
    small: 'text-xs text-gray-500 dark:text-gray-500'
  },
  colors: {
    light: {
      primary: '#1f2937',
      secondary: '#374151',
      accent: '#3b82f6',
      background: '#ffffff',
      surface: '#f9fafb'
    },
    dark: {
      primary: '#f9fafb',
      secondary: '#e5e7eb',
      accent: '#60a5fa',
      background: '#111827',
      surface: '#1f2937'
    }
  },
  sections: {
    spacing: 'space-y-8',
    padding: 'p-8',
    marginBottom: 'mb-12'
  }
} as const

// Quality thresholds for report generation
export const REPORT_QUALITY_THRESHOLDS = {
  minOpportunities: 1,
  maxOpportunities: 100,
  minConfidenceScore: 0.5,
  maxProcessingTime: 60000, // 60 seconds
  maxReportSize: 50 * 1024 * 1024, // 50MB for PDF
  pdfTimeout: 30000, // 30 seconds for PDF generation
  shareTokenLength: 32,
  passwordMinLength: 8
} as const