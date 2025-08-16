import { z } from 'zod'

/**
 * Zod schemas for 10-Dimensional AI Scoring System validation
 * AC: 1 - AI extracts and analyzes 10 business dimensions
 * AC: 2 - Scored dimensions rated 1-10 with confidence intervals
 */

// User feedback schema
export const dimensionFeedbackSchema = z.object({
  userRating: z.enum(['positive', 'negative']).nullable(),
  userId: z.string(),
  timestamp: z.string()
})

// Base classification schema (categorical dimensions)
export const dimensionClassificationSchema = z.object({
  value: z.string().min(1, 'Classification value cannot be empty'),
  confidence: z.number().min(0).max(1).describe('Confidence level between 0 and 1'),
  evidence: z.array(z.string()).min(1, 'At least one evidence quote required'),
  reasoning: z.string().min(10, 'Reasoning must be at least 10 characters'),
  alternatives: z.array(z.string()).optional(),
  feedback: z.array(dimensionFeedbackSchema).optional()
})

// Base score schema (numerical dimensions)
export const dimensionScoreSchema = z.object({
  score: z.number().int().min(1).max(10).describe('Score on 1-10 scale'),
  confidence: z.number().min(0).max(1).describe('Confidence level between 0 and 1'),
  evidence: z.array(z.string()).min(1, 'At least one evidence quote required'),
  reasoning: z.string().min(10, 'Reasoning must be at least 10 characters'),
  weight: z.number().min(0).max(1).describe('Weight in composite calculation'),
  feedback: z.array(dimensionFeedbackSchema).optional()
})

// Complete dimensional analysis schema
export const dimensionalAnalysisSchema = z.object({
  // Classified dimensions
  persona: dimensionClassificationSchema,
  industryVertical: dimensionClassificationSchema,
  userRole: dimensionClassificationSchema,
  workflowStage: dimensionClassificationSchema,
  
  // Scored dimensions
  emotionLevel: dimensionScoreSchema,
  marketSize: dimensionScoreSchema,
  technicalComplexity: dimensionScoreSchema,
  existingSolutions: dimensionScoreSchema,
  budgetContext: dimensionScoreSchema,
  timeSensitivity: dimensionScoreSchema,
  
  // Meta information
  compositeScore: z.number().min(1).max(100).describe('Weighted composite score 1-100'),
  confidenceScore: z.number().min(0).max(1).describe('Overall confidence 0-1'),
  analysisVersion: z.string().default('1.0.0'),
  processingTime: z.number().positive().describe('Processing time in milliseconds'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
})

// AI response schema for dimensional analysis
// This is what we expect from the AI, before adding metadata
export const aiDimensionalResponseSchema = z.object({
  classifications: z.object({
    persona: z.object({
      value: z.string(),
      confidence: z.number().min(0).max(1),
      evidence: z.array(z.string()),
      reasoning: z.string(),
      alternatives: z.array(z.string()).optional()
    }),
    industryVertical: z.object({
      value: z.string(),
      confidence: z.number().min(0).max(1),
      evidence: z.array(z.string()),
      reasoning: z.string()
    }),
    userRole: z.object({
      value: z.string(),
      confidence: z.number().min(0).max(1),
      evidence: z.array(z.string()),
      reasoning: z.string()
    }),
    workflowStage: z.object({
      value: z.string(),
      confidence: z.number().min(0).max(1),
      evidence: z.array(z.string()),
      reasoning: z.string()
    })
  }),
  
  scores: z.object({
    emotionLevel: z.object({
      score: z.number().int().min(1).max(10),
      confidence: z.number().min(0).max(1),
      evidence: z.array(z.string()),
      reasoning: z.string()
    }),
    marketSize: z.object({
      score: z.number().int().min(1).max(10),
      confidence: z.number().min(0).max(1),
      evidence: z.array(z.string()),
      reasoning: z.string()
    }),
    technicalComplexity: z.object({
      score: z.number().int().min(1).max(10),
      confidence: z.number().min(0).max(1),
      evidence: z.array(z.string()),
      reasoning: z.string()
    }),
    existingSolutions: z.object({
      score: z.number().int().min(1).max(10),
      confidence: z.number().min(0).max(1),
      evidence: z.array(z.string()),
      reasoning: z.string()
    }),
    budgetContext: z.object({
      score: z.number().int().min(1).max(10),
      confidence: z.number().min(0).max(1),
      evidence: z.array(z.string()),
      reasoning: z.string()
    }),
    timeSensitivity: z.object({
      score: z.number().int().min(1).max(10),
      confidence: z.number().min(0).max(1),
      evidence: z.array(z.string()),
      reasoning: z.string()
    })
  })
})

// Feedback submission schema
export const dimensionFeedbackSubmissionSchema = z.object({
  opportunityId: z.string().uuid(),
  dimensionName: z.string(),
  userRating: z.enum(['positive', 'negative']),
  userId: z.string()
})

// Consistency metrics schema
export const scoringConsistencyMetricsSchema = z.object({
  analysisId: z.string(),
  dimensionName: z.string(),
  averageScore: z.number().optional(),
  averageConfidence: z.number().min(0).max(1),
  standardDeviation: z.number().optional(),
  sampleSize: z.number().int().positive(),
  lastUpdated: z.date()
})

// Feedback summary schema
export const dimensionFeedbackSummarySchema = z.object({
  dimensionName: z.string(),
  totalFeedback: z.number().int().nonnegative(),
  positiveFeedback: z.number().int().nonnegative(),
  negativeFeedback: z.number().int().nonnegative(),
  accuracyRate: z.number().min(0).max(100),
  lastUpdated: z.date()
})

// Types
export type DimensionalAnalysis = z.infer<typeof dimensionalAnalysisSchema>
export type AIDimensionalResponse = z.infer<typeof aiDimensionalResponseSchema>
export type DimensionFeedbackSubmission = z.infer<typeof dimensionFeedbackSubmissionSchema>
export type ScoringConsistencyMetrics = z.infer<typeof scoringConsistencyMetricsSchema>
export type DimensionFeedbackSummary = z.infer<typeof dimensionFeedbackSummarySchema>