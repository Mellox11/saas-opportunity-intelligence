import { z } from 'zod'

// Opportunity validation schemas
export const opportunitySchema = z.object({
  id: z.string().uuid(),
  analysisId: z.string().uuid(),
  sourcePostId: z.string().uuid().nullable(),
  title: z.string().max(200),
  problemStatement: z.string(),
  opportunityScore: z.number().int().min(0).max(100),
  confidenceScore: z.number().min(0).max(1),
  urgencyScore: z.number().int().min(0).max(100),
  marketSignalsScore: z.number().int().min(0).max(100),
  feasibilityScore: z.number().int().min(0).max(100),
  classification: z.enum(['saas_feasible', 'not_feasible']),
  evidence: z.array(z.string()),
  antiPatterns: z.array(z.string()).nullable(),
  metadata: z.record(z.any()).optional()
})

// Analysis result schema
export const analysisResultSchema = z.object({
  analysisId: z.string().uuid(),
  status: z.enum(['completed', 'failed', 'partial']),
  postsAnalyzed: z.number().int(),
  opportunitiesFound: z.number().int(),
  topOpportunities: z.array(opportunitySchema),
  completedAt: z.string().datetime(),
  totalCost: z.number().positive(),
  processingTime: z.number().positive() // in seconds
})

// Batch processing request schema
export const batchProcessingRequestSchema = z.object({
  analysisId: z.string().uuid(),
  postIds: z.array(z.string().uuid()),
  batchSize: z.number().int().min(1).max(50).default(10)
})

export type Opportunity = z.infer<typeof opportunitySchema>
export type AnalysisResult = z.infer<typeof analysisResultSchema>
export type BatchProcessingRequest = z.infer<typeof batchProcessingRequestSchema>