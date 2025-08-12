import { z } from 'zod'

export const configurationSchema = z.object({
  subreddits: z.array(
    z.string()
      .regex(/^[a-zA-Z0-9_]+$/, 'Invalid subreddit format')
      .min(1, 'Subreddit name cannot be empty')
  ).min(1, 'At least one subreddit is required').max(3, 'Maximum 3 subreddits allowed'),
  
  timeRange: z.union([z.literal(30), z.literal(60), z.literal(90)], {
    errorMap: () => ({ message: 'Time range must be 30, 60, or 90 days' })
  }),
  
  keywords: z.object({
    predefined: z.array(z.string()).default([]),
    custom: z.array(
      z.string()
        .max(50, 'Custom keyword cannot exceed 50 characters')
        .min(1, 'Custom keyword cannot be empty')
    ).default([])
  }),
  
  name: z.string()
    .max(100, 'Configuration name cannot exceed 100 characters')
    .min(1, 'Configuration name cannot be empty')
    .optional()
})

export const subredditValidationSchema = z.object({
  subreddit: z.string()
    .regex(/^[a-zA-Z0-9_]+$/, 'Invalid subreddit format')
    .min(1, 'Subreddit name is required')
})

export const postEstimationSchema = z.object({
  subreddits: z.array(z.string()).min(1, 'At least one subreddit is required'),
  timeRange: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  keywords: z.object({
    predefined: z.array(z.string()).default([]),
    custom: z.array(z.string()).default([])
  }).default({ predefined: [], custom: [] })
})

export type AnalysisConfiguration = z.infer<typeof configurationSchema>
export type SubredditValidation = z.infer<typeof subredditValidationSchema>
export type PostEstimationRequest = z.infer<typeof postEstimationSchema>

// Predefined keyword categories
export const PREDEFINED_KEYWORDS = {
  frustration: [
    'I hate',
    'frustrating',
    'annoying',
    'terrible',
    'awful',
    'worst',
    'broken',
    'useless'
  ],
  needs: [
    'I need a tool',
    'looking for',
    'need help',
    'anyone know',
    'recommendations',
    'suggestions',
    'alternatives'
  ],
  problems: [
    'problem with',
    'issue with',
    'trouble with',
    'struggling with',
    'can\'t figure out',
    'doesn\'t work',
    'not working'
  ],
  solutions: [
    'solution',
    'fix',
    'workaround',
    'how to',
    'tutorial',
    'guide',
    'help me'
  ]
} as const