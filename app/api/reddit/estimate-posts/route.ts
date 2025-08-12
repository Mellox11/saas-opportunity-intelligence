import { NextRequest, NextResponse } from 'next/server'
import { postEstimationSchema } from '@/lib/validation/analysis-schema'
import { ApiErrorHandler } from '@/lib/utils/api-response'

// Simple estimation logic - in a real implementation, this would query Reddit API
function estimatePostCount(subreddits: string[], timeRange: number, keywords: any): number {
  // Base estimation per subreddit per day
  const basePostsPerDay: { [key: string]: number } = {
    'entrepreneur': 50,
    'sideproject': 20,
    'startups': 30,
    'freelance': 15,
    'webdev': 80,
    'programming': 100,
    'javascript': 60,
    'react': 40,
    'nextjs': 25
  }
  
  let totalEstimate = 0
  
  for (const subreddit of subreddits) {
    const dailyPosts = basePostsPerDay[subreddit.toLowerCase()] || 10 // Default estimate
    const subredditTotal = dailyPosts * timeRange
    
    // Keyword filtering reduces the count
    const keywordCount = keywords.predefined.length + keywords.custom.length
    const filterMultiplier = keywordCount > 0 ? Math.max(0.1, 1 - (keywordCount * 0.1)) : 1
    
    totalEstimate += Math.floor(subredditTotal * filterMultiplier)
  }
  
  return Math.max(1, totalEstimate) // Minimum of 1
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedRequest = postEstimationSchema.parse(body)
    
    const { subreddits, timeRange, keywords } = validatedRequest
    
    const estimatedPosts = estimatePostCount(subreddits, timeRange, keywords)
    
    // Rough cost estimation (this would be more sophisticated in production)
    const redditApiCost = Math.ceil(estimatedPosts / 1000) * 0.10 // $0.10 per 1000 posts
    const aiProcessingCost = estimatedPosts * 0.001 // $0.001 per post
    const totalEstimatedCost = redditApiCost + aiProcessingCost
    
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
        postsPerSubreddit: subreddits.map(subreddit => ({
          subreddit,
          estimatedPosts: Math.floor(estimatedPosts / subreddits.length)
        }))
      }
    })
  } catch (error) {
    return ApiErrorHandler.handleError(error, 'Post estimation')
  }
}