import { NextRequest, NextResponse } from 'next/server'
import { subredditValidationSchema } from '@/lib/validation/analysis-schema'
import { ApiErrorHandler } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

// Simple in-memory cache for subreddit validation
const validationCache = new Map<string, { isValid: boolean, timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

async function validateSubredditWithReddit(subreddit: string): Promise<boolean> {
  try {
    // Normalize subreddit name for consistency
    const normalizedSubreddit = subreddit.toLowerCase()
    
    // Popular subreddits always bypass API validation
    const popularSubreddits = [
      'entrepreneur', 'sideproject', 'startups', 'freelance', 
      'webdev', 'programming', 'javascript', 'react', 'nextjs', 'indiehackers'
    ]
    
    if (popularSubreddits.includes(normalizedSubreddit)) {
      console.log(`✅ BYPASS: Popular subreddit r/${normalizedSubreddit} validated instantly (API route)`)
      // Cache as valid
      validationCache.set(normalizedSubreddit, {
        isValid: true,
        timestamp: Date.now()
      })
      return true
    }
    
    // Check cache for non-popular subreddits
    const cached = validationCache.get(normalizedSubreddit)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`Using cached result for r/${normalizedSubreddit}: ${cached.isValid}`)
      return cached.isValid
    }

    console.log(`Validating subreddit via Reddit API: r/${normalizedSubreddit}`)

    // Make request to Reddit API with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(`https://www.reddit.com/r/${normalizedSubreddit}/about.json`, {
      headers: {
        'User-Agent': process.env.REDDIT_USER_AGENT || 'SaaS-Opportunity-Intelligence/1.0'
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    const isValid = response.status === 200
    
    console.log(`Reddit API response for r/${normalizedSubreddit}: ${response.status} - ${isValid ? 'valid' : 'invalid'}`)
    
    // Cache the result
    validationCache.set(normalizedSubreddit, {
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
      // Cache as valid even on error for popular subreddits
      validationCache.set(subreddit.toLowerCase(), {
        isValid: true,
        timestamp: Date.now()
      })
      return true
    }
    
    // On error for non-popular subreddits, assume invalid
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subreddit } = subredditValidationSchema.parse(body)
    
    // Clean subreddit name (remove r/ prefix if present) and normalize
    const cleanSubreddit = subreddit.replace(/^r\//, '').toLowerCase()
    
    // Quick bypass for popular subreddits to avoid unnecessary API calls
    const popularSubreddits = [
      'entrepreneur', 'sideproject', 'startups', 'freelance', 
      'webdev', 'programming', 'javascript', 'react', 'nextjs', 'indiehackers'
    ]
    
    if (popularSubreddits.includes(cleanSubreddit)) {
      console.log(`✅ INSTANT: Popular subreddit r/${cleanSubreddit} validated without API call`)
      return ApiErrorHandler.success({
        subreddit: cleanSubreddit,
        isValid: true,
        message: 'Popular subreddit - validated instantly',
        bypassedApi: true
      })
    }
    
    const isValid = await validateSubredditWithReddit(cleanSubreddit)
    
    return ApiErrorHandler.success({
      subreddit: cleanSubreddit,
      isValid,
      message: isValid ? 'Subreddit exists' : 'Subreddit not found or private',
      bypassedApi: false
    })
  } catch (error) {
    // If there's any error, check if it's a popular subreddit
    const popularSubreddits = [
      'entrepreneur', 'sideproject', 'startups', 'freelance', 
      'webdev', 'programming', 'javascript', 'react', 'nextjs', 'indiehackers'
    ]
    
    const cleanSubreddit = (error as any)?.subreddit?.toLowerCase() || ''
    if (popularSubreddits.includes(cleanSubreddit)) {
      return ApiErrorHandler.success({
        subreddit: cleanSubreddit,
        isValid: true,
        message: 'Popular subreddit - validated on error fallback',
        bypassedApi: true
      })
    }
    
    return ApiErrorHandler.handleError(error, 'Subreddit validation')
  }
}