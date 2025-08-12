import { NextRequest, NextResponse } from 'next/server'
import { subredditValidationSchema } from '@/lib/validation/analysis-schema'
import { ApiErrorHandler } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

// Simple in-memory cache for subreddit validation
const validationCache = new Map<string, { isValid: boolean, timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

async function validateSubredditWithReddit(subreddit: string): Promise<boolean> {
  try {
    // Check cache first
    const cached = validationCache.get(subreddit)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`Using cached result for r/${subreddit}: ${cached.isValid}`)
      return cached.isValid
    }

    console.log(`Validating subreddit: r/${subreddit}`)

    // Make request to Reddit API with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(`https://www.reddit.com/r/${subreddit}/about.json`, {
      headers: {
        'User-Agent': process.env.REDDIT_USER_AGENT || 'SaaS-Opportunity-Intelligence/1.0'
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    const isValid = response.status === 200
    
    console.log(`Reddit API response for r/${subreddit}: ${response.status} - ${isValid ? 'valid' : 'invalid'}`)
    
    // Cache the result
    validationCache.set(subreddit, {
      isValid,
      timestamp: Date.now()
    })

    return isValid
  } catch (error) {
    console.error(`Reddit API error for r/${subreddit}:`, error)
    
    // For well-known subreddits, assume they exist if API fails
    const popularSubreddits = [
      'entrepreneur', 'sideproject', 'startups', 'freelance', 
      'webdev', 'programming', 'javascript', 'react', 'nextjs', 'indiehackers'
    ]
    
    if (popularSubreddits.includes(subreddit.toLowerCase())) {
      console.log(`Assuming popular subreddit r/${subreddit} is valid despite API error`)
      return true
    }
    
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