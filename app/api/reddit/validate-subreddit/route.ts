import { NextRequest, NextResponse } from 'next/server'
import { subredditValidationSchema } from '@/lib/validation/analysis-schema'
import { ApiErrorHandler } from '@/lib/utils/api-response'

// Simple in-memory cache for subreddit validation
const validationCache = new Map<string, { isValid: boolean, timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

async function validateSubredditWithReddit(subreddit: string): Promise<boolean> {
  try {
    // Check cache first
    const cached = validationCache.get(subreddit)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.isValid
    }

    // Make request to Reddit API
    const response = await fetch(`https://www.reddit.com/r/${subreddit}/about.json`, {
      headers: {
        'User-Agent': 'SaaS-Opportunity-Intelligence/1.0'
      }
    })

    const isValid = response.status === 200
    
    // Cache the result
    validationCache.set(subreddit, {
      isValid,
      timestamp: Date.now()
    })

    return isValid
  } catch (error) {
    console.error('Reddit API error:', error)
    // On error, assume invalid
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subreddit } = subredditValidationSchema.parse(body)
    
    // Clean subreddit name (remove r/ prefix if present)
    const cleanSubreddit = subreddit.replace(/^r\//, '')
    
    const isValid = await validateSubredditWithReddit(cleanSubreddit)
    
    return ApiErrorHandler.success({
      subreddit: cleanSubreddit,
      isValid,
      message: isValid ? 'Subreddit exists' : 'Subreddit not found or private'
    })
  } catch (error) {
    return ApiErrorHandler.handleError(error, 'Subreddit validation')
  }
}