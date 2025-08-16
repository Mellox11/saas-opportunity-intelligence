/**
 * TypeScript interfaces for 10-Dimensional AI Scoring System
 * AC: 1 - AI extracts and analyzes 10 business dimensions
 * AC: 2 - Scored dimensions rated 1-10 with confidence intervals
 */

// User feedback for dimension validation
export interface DimensionFeedback {
  userRating: 'positive' | 'negative' | null
  userId: string
  timestamp: string
}

// Base interface for dimension classification (categorical)
export interface DimensionClassification {
  value: string // e.g., "dogwalker", "software-engineer", "retail"
  confidence: number // 0-1 confidence level
  evidence: string[] // Supporting quotes from content
  reasoning: string // AI rationale for classification
  alternatives?: string[] // Other possible classifications considered
  feedback?: DimensionFeedback[]
}

// Base interface for dimension score (numerical 1-10)
export interface DimensionScore {
  score: number // 1-10 scale
  confidence: number // 0-1 confidence level
  evidence: string[] // Supporting quotes from content
  reasoning: string // AI rationale for score
  weight: number // Dimension weight in composite calculation
  feedback?: DimensionFeedback[]
}

// Complete dimensional analysis structure
export interface DimensionalAnalysis {
  // Classified dimensions (categorical)
  persona: DimensionClassification
  industryVertical: DimensionClassification
  userRole: DimensionClassification
  workflowStage: DimensionClassification
  
  // Scored dimensions (1-10 scale)
  emotionLevel: DimensionScore
  marketSize: DimensionScore
  technicalComplexity: DimensionScore
  existingSolutions: DimensionScore
  budgetContext: DimensionScore
  timeSensitivity: DimensionScore
  
  // Meta-analysis information
  compositeScore: number // 1-100 weighted score (only from scored dimensions)
  confidenceScore: number // 0-1 overall confidence
  analysisVersion: string // For tracking analysis model versions
  processingTime: number // Milliseconds for performance tracking
  createdAt?: Date
  updatedAt?: Date
}

// Default dimension weights optimized for SaaS viability
export const DEFAULT_DIMENSION_WEIGHTS = {
  emotionLevel: 0.15, // User frustration/pain level
  marketSize: 0.25, // Market opportunity size
  technicalComplexity: 0.15, // Lower complexity = better (inverted)
  existingSolutions: 0.15, // Lower competition = better (inverted)
  budgetContext: 0.20, // Budget availability and willingness to pay
  timeSensitivity: 0.10 // Urgency of the need
} as const

// Ensure weights sum to 1.0
const weightSum = Object.values(DEFAULT_DIMENSION_WEIGHTS).reduce((sum, weight) => sum + weight, 0)
if (Math.abs(weightSum - 1.0) > 0.001) {
  throw new Error(`Dimension weights must sum to 1.0, but sum to ${weightSum}`)
}

// Dimension definitions for help tooltips and documentation
export const DIMENSION_DEFINITIONS = {
  // Classifications
  persona: {
    name: 'Persona',
    description: 'The specific role or profession of the person experiencing the problem',
    examples: ['dogwalker', 'freelance-designer', 'small-business-owner', 'software-engineer'],
    helpText: 'Identifies WHO has this problem for targeted solution development'
  },
  industryVertical: {
    name: 'Industry Vertical',
    description: 'The business sector or industry where the problem exists',
    examples: ['healthcare', 'e-commerce', 'education', 'retail', 'pet-services'],
    helpText: 'Helps identify market segments and industry-specific needs'
  },
  userRole: {
    name: 'User Role',
    description: 'The organizational position and decision-making power of the user',
    examples: ['individual-contributor', 'team-lead', 'business-owner', 'decision-maker'],
    helpText: 'Indicates purchasing authority and implementation capability'
  },
  workflowStage: {
    name: 'Workflow Stage',
    description: 'Where the user is in their problem-solving journey',
    examples: ['problem-identification', 'solution-research', 'vendor-evaluation', 'growth-optimization'],
    helpText: 'Shows readiness to adopt a solution and urgency level'
  },
  
  // Scores
  emotionLevel: {
    name: 'Emotion Level',
    description: 'Intensity of frustration or pain expressed (1-10)',
    scale: '1 = Mild annoyance, 10 = Extreme frustration',
    helpText: 'Higher scores indicate stronger motivation to find solutions'
  },
  marketSize: {
    name: 'Market Size',
    description: 'Potential market opportunity and scalability (1-10)',
    scale: '1 = Niche market, 10 = Massive market opportunity',
    helpText: 'Larger markets offer greater revenue potential'
  },
  technicalComplexity: {
    name: 'Technical Complexity',
    description: 'Implementation difficulty and technical requirements (1-10)',
    scale: '1 = Simple to build, 10 = Extremely complex',
    helpText: 'Lower complexity means faster time to market and lower costs'
  },
  existingSolutions: {
    name: 'Existing Solutions',
    description: 'Level of competition and market saturation (1-10)',
    scale: '1 = No competition, 10 = Highly saturated market',
    helpText: 'Less competition indicates better opportunity for new entrants'
  },
  budgetContext: {
    name: 'Budget Context',
    description: 'Financial capacity and willingness to pay (1-10)',
    scale: '1 = Very limited budget, 10 = Strong budget availability',
    helpText: 'Higher scores indicate better monetization potential'
  },
  timeSensitivity: {
    name: 'Time Sensitivity',
    description: 'Urgency and time constraints for solving the problem (1-10)',
    scale: '1 = No urgency, 10 = Extremely urgent',
    helpText: 'Higher urgency leads to faster adoption decisions'
  }
} as const

// Quality thresholds for dimensional analysis
export const QUALITY_THRESHOLDS = {
  minConfidence: 0.6, // Minimum confidence for a dimension to be considered reliable
  minEvidence: 1, // Minimum number of evidence quotes required
  maxProcessingTime: 30000, // Maximum processing time in milliseconds (30 seconds)
  minCompositeScore: 40, // Minimum composite score to consider opportunity viable
  highQualityScore: 70 // Composite score threshold for high-quality opportunities
} as const

// Scoring consistency metrics
export interface ScoringConsistencyMetrics {
  analysisId: string
  dimensionName: string
  averageScore?: number // For scored dimensions
  averageConfidence: number
  standardDeviation?: number
  sampleSize: number
  lastUpdated: Date
}

// User feedback aggregation
export interface DimensionFeedbackSummary {
  dimensionName: string
  totalFeedback: number
  positiveFeedback: number
  negativeFeedback: number
  accuracyRate: number // (positive / total) * 100
  lastUpdated: Date
}