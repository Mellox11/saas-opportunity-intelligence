import { AnalysisConfiguration } from '@/lib/validation/analysis-schema'
import { CostBreakdown, CostEstimateResponse } from '@/lib/validation/cost-schema'

// Cost constants based on unit economics model
const COST_CONSTANTS = {
  REDDIT_API_PER_REQUEST: 0.00012, // $0.012 per 100 requests
  REDDIT_REQUESTS_PER_ANALYSIS: 100, // Estimated requests per analysis
  AI_COST_PER_ANALYSIS: 1.40, // $1.40 per analysis with Vercel AI SDK optimization
  MARKUP_MULTIPLIER: 4, // 4x markup for transparent pricing
  DEFAULT_ACCURACY: 85, // Default accuracy percentage for new systems
} as const

// Estimate post count based on subreddit activity (simplified estimates)
const SUBREDDIT_ACTIVITY_ESTIMATES: Record<string, number> = {
  entrepreneur: 150,
  sideproject: 75,
  startups: 200,
  freelance: 100,
  default: 100, // For unknown subreddits
}

/**
 * Calculate the estimated number of Reddit API requests
 * based on configuration parameters
 */
export function calculateRedditRequests(
  subreddits: string[],
  timeRange: 30 | 60 | 90
): number {
  // Base calculation: more subreddits and longer time range = more requests
  const subredditMultiplier = subreddits.length
  const timeRangeMultiplier = timeRange / 30 // 1x for 30 days, 2x for 60, 3x for 90
  
  // Estimate based on average activity levels
  const estimatedPostsPerSubreddit = subreddits.reduce((total, sub) => {
    const activity = SUBREDDIT_ACTIVITY_ESTIMATES[sub.toLowerCase()] || 
                    SUBREDDIT_ACTIVITY_ESTIMATES.default
    return total + activity
  }, 0)
  
  // Calculate total requests (posts + comments sampling)
  const baseRequests = estimatedPostsPerSubreddit * timeRangeMultiplier
  const commentRequests = baseRequests * 0.5 // Sample 50% of posts for comments
  
  return Math.ceil(baseRequests + commentRequests)
}

/**
 * Calculate the cost breakdown for an analysis configuration
 */
export function calculateCostBreakdown(
  configuration: AnalysisConfiguration
): CostBreakdown {
  const { subreddits, timeRange, commentAnalysisEnabled = true } = configuration
  
  // Calculate Reddit API cost (includes both posts and comments)
  const redditRequests = calculateRedditRequests(subreddits, timeRange)
  const redditCost = (redditRequests / 100) * (COST_CONSTANTS.REDDIT_API_PER_REQUEST * 100)
  
  // Base AI cost
  let aiCost = COST_CONSTANTS.AI_COST_PER_ANALYSIS
  
  // AC: 10 - Comment analysis can be disabled by user to reduce costs if not needed
  if (commentAnalysisEnabled) {
    // Comment analysis cost (AC: 5 - adds 15-30% to total analysis cost)
    // Estimate based on high-scoring posts needing comment analysis
    const commentAnalysisCost = COST_CONSTANTS.AI_COST_PER_ANALYSIS * 0.20 // 20% increase for comment analysis
    aiCost += commentAnalysisCost
  }
  
  // Total cost before markup
  const totalCost = redditCost + aiCost
  
  return {
    reddit: parseFloat(redditCost.toFixed(4)),
    ai: parseFloat(aiCost.toFixed(4)),
    total: parseFloat(totalCost.toFixed(4))
  }
}

/**
 * Calculate the final price with markup
 */
export function calculateFinalPrice(breakdown: CostBreakdown): number {
  return parseFloat((breakdown.total * COST_CONSTANTS.MARKUP_MULTIPLIER).toFixed(2))
}

/**
 * Generate a complete cost estimate response
 */
export function generateCostEstimate(
  configuration: AnalysisConfiguration,
  historicalAccuracy?: number
): CostEstimateResponse {
  const breakdown = calculateCostBreakdown(configuration)
  const finalPrice = calculateFinalPrice(breakdown)
  
  return {
    breakdown,
    finalPrice,
    currency: 'USD' as const,
    accuracy: historicalAccuracy ?? COST_CONSTANTS.DEFAULT_ACCURACY
  }
}

/**
 * Check if estimated cost is within budget
 */
export function isWithinBudget(
  estimatedCost: number,
  budgetLimit: number
): boolean {
  return estimatedCost <= budgetLimit
}

/**
 * Calculate budget status and warning level
 */
export function calculateBudgetStatus(
  currentCost: number,
  budgetLimit: number
): 'within_budget' | 'approaching_limit' | 'exceeded' {
  const percentUsed = (currentCost / budgetLimit) * 100
  
  if (percentUsed >= 100) return 'exceeded'
  if (percentUsed >= 80) return 'approaching_limit'
  return 'within_budget'
}

/**
 * Calculate cost accuracy percentage
 */
export function calculateAccuracy(
  estimatedCost: number,
  actualCost: number
): number {
  if (actualCost === 0) return 100
  
  const difference = Math.abs(estimatedCost - actualCost)
  const percentDifference = (difference / actualCost) * 100
  
  // Accuracy is 100% minus the percent difference, clamped to 0-100
  const accuracy = Math.max(0, Math.min(100, 100 - percentDifference))
  
  return parseFloat(accuracy.toFixed(2))
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Calculate if automatic stop should trigger
 */
export function shouldTriggerCircuitBreaker(
  currentCost: number,
  approvedLimit: number,
  threshold: number = 0.95 // Stop at 95% of limit by default
): boolean {
  return currentCost >= (approvedLimit * threshold)
}

/**
 * Estimate token usage for AI processing
 */
export function estimateTokenUsage(
  postCount: number,
  averagePostLength: number = 500 // characters
): number {
  // Rough estimation: 1 token ≈ 4 characters
  const tokensPerPost = averagePostLength / 4
  const inputTokens = postCount * tokensPerPost
  
  // Output is typically 20% of input for summaries
  const outputTokens = inputTokens * 0.2
  
  return Math.ceil(inputTokens + outputTokens)
}

/**
 * Calculate incremental cost for a cost event
 */
export function calculateEventCost(
  eventType: 'reddit_api_request' | 'openai_tokens' | 'openai_comment_tokens' | 'reddit_comment_request' | 'pinecone_query' | 'pinecone_upsert',
  quantity: number
): number {
  switch (eventType) {
    case 'reddit_api_request':
      return quantity * COST_CONSTANTS.REDDIT_API_PER_REQUEST
    case 'reddit_comment_request':
      // Comment collection has same cost as regular API requests
      return quantity * COST_CONSTANTS.REDDIT_API_PER_REQUEST
    case 'openai_tokens':
      // GPT-4 pricing: ~$0.03 per 1K tokens input, $0.06 per 1K output
      // Using average of $0.045 per 1K tokens
      return (quantity / 1000) * 0.045
    case 'openai_comment_tokens':
      // Claude-3 Sonnet pricing: $3.00 per 1M tokens (input/output combined)
      // More cost-effective than GPT-4 for comment analysis
      return (quantity / 1000000) * 3.00
    case 'pinecone_query':
      // Pinecone query pricing (simplified)
      return quantity * 0.0001
    case 'pinecone_upsert':
      // Pinecone upsert pricing (simplified)
      return (quantity / 1000) * 0.01
    default:
      return 0
  }
}