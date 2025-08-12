import { z } from 'zod'
import { configurationSchema } from './analysis-schema'

// Cost estimation request schema
export const costEstimateSchema = z.object({
  configuration: configurationSchema, // reuse from analysis-schema
  budgetLimit: z.number().min(1).max(1000).optional()
})

// Cost approval schema
export const costApprovalSchema = z.object({
  analysisId: z.string().uuid(),
  estimatedCost: z.number().positive(),
  approvedBudget: z.number().positive(),
  acknowledged: z.boolean().refine(val => val === true, {
    message: 'Cost approval must be acknowledged'
  })
})

// Cost event schema for tracking
export const costEventSchema = z.object({
  analysisId: z.string().uuid(),
  eventType: z.enum(['reddit_api_request', 'openai_tokens', 'pinecone_query', 'pinecone_upsert']),
  provider: z.string(),
  quantity: z.number().int().positive(),
  unitCost: z.number().positive(),
  totalCost: z.number().positive(),
  eventData: z.record(z.any()).optional()
})

// Cost breakdown response schema
export const costBreakdownSchema = z.object({
  reddit: z.number().nonnegative(),
  ai: z.number().nonnegative(),
  total: z.number().nonnegative()
})

// Cost estimate response schema
export const costEstimateResponseSchema = z.object({
  breakdown: costBreakdownSchema,
  finalPrice: z.number().positive(), // with 4x markup
  currency: z.literal('USD'),
  accuracy: z.number().min(0).max(100) // historical accuracy percentage
})

// Budget validation schema
export const budgetSchema = z.object({
  limit: z.number().min(1).max(1000),
  currency: z.literal('USD').default('USD')
})

// Cost tracking update schema
export const costTrackingUpdateSchema = z.object({
  analysisId: z.string().uuid(),
  currentCost: z.number().nonnegative(),
  estimatedCost: z.number().positive(),
  budgetLimit: z.number().positive(),
  percentComplete: z.number().min(0).max(100),
  status: z.enum(['within_budget', 'approaching_limit', 'exceeded', 'stopped'])
})

export type CostEstimateRequest = z.infer<typeof costEstimateSchema>
export type CostApprovalRequest = z.infer<typeof costApprovalSchema>
export type CostEvent = z.infer<typeof costEventSchema>
export type CostBreakdown = z.infer<typeof costBreakdownSchema>
export type CostEstimateResponse = z.infer<typeof costEstimateResponseSchema>
export type Budget = z.infer<typeof budgetSchema>
export type CostTrackingUpdate = z.infer<typeof costTrackingUpdateSchema>