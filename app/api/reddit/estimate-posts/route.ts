import { NextRequest, NextResponse } from 'next/server'
import { postEstimationSchema } from '@/lib/validation/analysis-schema'
import { ApiErrorHandler } from '@/lib/utils/api-response'
import { HybridRedditClient } from '@/lib/services/hybrid-reddit-client'

// Real-time estimation using RSS sampling
async function estimatePostCount(
  subreddits: string[], 
  timeRange: number, 
  keywords: { predefined: string[], custom: string[] }
): Promise<{ estimatedPosts: number, breakdown: Array<{ subreddit: string, estimatedPosts: number }> }> {
  const client = new HybridRedditClient()
  let totalEstimate = 0
  const breakdown: Array<{ subreddit: string, estimatedPosts: number }> = []
  
  console.log(`📊 Getting real-time estimates for ${subreddits.length} subreddits...`)
  
  for (const subreddit of subreddits) {
    try {
      const estimate = await client.getRealtimePostEstimate(subreddit, timeRange, keywords)
      totalEstimate += estimate.estimatedPosts
      breakdown.push({
        subreddit,
        estimatedPosts: estimate.estimatedPosts
      })
      
      console.log(`📈 r/${subreddit}: ~${estimate.estimatedPosts} posts (sample: ${estimate.sampleSize})`)
      
    } catch (error) {
      console.error(`❌ Failed to estimate for r/${subreddit}:`, error)
      
      // Fallback to conservative estimate if RSS fails
      const fallbackEstimate = Math.max(1, Math.floor(timeRange * 2)) // 2 posts per day fallback
      totalEstimate += fallbackEstimate
      breakdown.push({
        subreddit,
        estimatedPosts: fallbackEstimate
      })
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  return {
    estimatedPosts: Math.max(1, totalEstimate),
    breakdown
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedRequest = postEstimationSchema.parse(body)
    
    const { subreddits, timeRange, keywords } = validatedRequest
    
    console.log(`📊 Starting real-time estimation for ${subreddits.length} subreddits`)
    
    // Get real-time estimation using RSS
    const { estimatedPosts, breakdown } = await estimatePostCount(subreddits, timeRange, keywords)
    
    // Calculate costs based on real estimates
    const redditApiCost = Math.ceil(estimatedPosts / 1000) * 0.10 // $0.10 per 1000 posts
    const aiProcessingCost = estimatedPosts * 0.001 // $0.001 per post
    const totalEstimatedCost = redditApiCost + aiProcessingCost
    
    console.log(`✅ Estimation complete: ${estimatedPosts} posts, $${totalEstimatedCost.toFixed(2)} estimated cost`)
    
    return ApiErrorHandler.success({
      estimatedPosts,
      timeRange,
      subreddits,
      costs: {
        redditApi: redditApiCost,
        aiProcessing: aiProcessingCost,
        total: totalEstimatedCost
      },
      breakdown: {
        postsPerSubreddit: breakdown
      }
    })
  } catch (error) {
    console.error('❌ Real-time estimation failed:', error)
    return ApiErrorHandler.handleError(error, 'Post estimation')
  }
}