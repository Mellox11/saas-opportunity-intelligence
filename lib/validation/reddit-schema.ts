import { z } from 'zod'

// Reddit Post Schema
export const redditPostSchema = z.object({
  redditId: z.string(),
  subreddit: z.string(),
  title: z.string(),
  content: z.string().nullable(),
  author: z.string(),
  score: z.number().int(),
  numComments: z.number().int(),
  createdUtc: z.string().or(z.date()),
  url: z.string().url(),
  permalink: z.string(),
  rawData: z.record(z.any()).optional()
})

// Reddit Comment Schema
export const redditCommentSchema = z.object({
  redditId: z.string(),
  postId: z.string(),
  parentId: z.string().nullable(),
  content: z.string(),
  author: z.string(),
  anonymizedAuthor: z.string().optional(),
  score: z.number().int(),
  createdUtc: z.string().or(z.date()),
  analysisMetadata: z.record(z.any()).optional(),
  processingStatus: z.enum(['pending', 'analyzing', 'completed', 'failed']).optional(),
  rawData: z.record(z.any()).optional()
})

// Comment Analysis Metadata Schema
export const commentAnalysisMetadataSchema = z.object({
  sentimentScore: z.number().min(-1).max(1), // -1 to 1 (negative to positive)
  confidenceScore: z.number().min(0).max(1), // 0 to 1
  validationSignals: z.object({
    agreement: z.boolean(),
    disagreement: z.boolean(),
    alternativeSolutions: z.array(z.string())
  }),
  enthusiasmLevel: z.enum(['high', 'medium', 'low']),
  skepticismLevel: z.enum(['high', 'medium', 'low']),
  processedAt: z.string().or(z.date()).optional(),
  aiModel: z.string().optional(),
  processingTimeMs: z.number().optional()
})

// Collection Request Schema
export const redditCollectionRequestSchema = z.object({
  subreddits: z.array(z.string()).min(1).max(5),
  timeRange: z.enum(['30', '60', '90']).transform(val => parseInt(val)),
  keywords: z.object({
    predefined: z.array(z.string()).default([]),
    custom: z.array(z.string()).default([])
  }),
  analysisId: z.string().uuid()
})

// Reddit API Response Types
export const redditListingSchema = z.object({
  kind: z.string(),
  data: z.object({
    after: z.string().nullable(),
    before: z.string().nullable(),
    children: z.array(z.object({
      kind: z.string(),
      data: z.record(z.any())
    }))
  })
})

// Processed Post Schema for Storage
export const processedRedditPostSchema = z.object({
  analysisId: z.string().uuid(),
  redditId: z.string(),
  subreddit: z.string(),
  title: z.string(),
  content: z.string().nullable(),
  author: z.string(),
  score: z.number(),
  numComments: z.number(),
  createdUtc: z.date(),
  url: z.string(),
  permalink: z.string(),
  rawData: z.record(z.any()),
  matchedKeywords: z.array(z.string()).default([]),
  processed: z.boolean().default(false)
})

// Types
export type RedditPost = z.infer<typeof redditPostSchema>
export type RedditComment = z.infer<typeof redditCommentSchema>
export type CommentAnalysisMetadata = z.infer<typeof commentAnalysisMetadataSchema>
export type RedditCollectionRequest = z.infer<typeof redditCollectionRequestSchema>
export type RedditListing = z.infer<typeof redditListingSchema>
export type ProcessedRedditPost = z.infer<typeof processedRedditPostSchema>