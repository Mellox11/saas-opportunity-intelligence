# 2. API Design & Integration Patterns

## Next.js API Architecture

The API layer follows REST conventions with Next.js API routes handling coordination while heavy processing occurs in background workers. All endpoints implement consistent error handling, authentication, and cost tracking patterns.

### Core API Structure

```typescript
// types/api.ts
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, any>
  }
  meta?: {
    timestamp: string
    requestId: string
    cost?: number
  }
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Standard error codes
export const API_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  PROCESSING_ERROR: 'PROCESSING_ERROR'
} as const
```

### Authentication Middleware

```typescript
// lib/auth-middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { db } from './db'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    emailVerified: boolean
  }
}

export async function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  options: {
    requireEmailVerification?: boolean
  } = {}
) {
  return async (req: AuthenticatedRequest) => {
    try {
      const authHeader = req.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } },
          { status: 401 }
        )
      }

      const token = authHeader.substring(7)
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      const user = await db.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, emailVerified: true }
      })

      if (!user) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
          { status: 401 }
        )
      }

      if (options.requireEmailVerification && !user.emailVerified) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Email verification required' } },
          { status: 403 }
        )
      }

      req.user = user
      return handler(req)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
        { status: 401 }
      )
    }
  }
}
```

## Reddit API Integration

```typescript
// lib/reddit-client.ts
import axios, { AxiosInstance } from 'axios'
import { RateLimiter } from './rate-limiter'
import { CircuitBreaker } from './circuit-breaker'

export class RedditClient {
  private client: AxiosInstance
  private rateLimiter: RateLimiter
  private circuitBreaker: CircuitBreaker
  private accessToken?: string
  private tokenExpiry?: Date

  constructor() {
    this.client = axios.create({
      baseURL: 'https://oauth.reddit.com',
      timeout: 30000,
      headers: {
        'User-Agent': 'SaasOpportunityTool/1.0 by YourUsername'
      }
    })

    // Reddit allows 100 requests per minute for OAuth apps
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: 100,
      interval: 60000 // 1 minute
    })

    this.circuitBreaker = new CircuitBreaker({
      timeout: 10000,
      errorThreshold: 5,
      resetTimeout: 30000
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(async (config) => {
      // Rate limiting
      await this.rateLimiter.removeTokens(1)
      
      // Ensure valid access token
      await this.ensureValidToken()
      config.headers.Authorization = `Bearer ${this.accessToken}`
      
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 429) {
          // Handle rate limiting with exponential backoff
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60')
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
          return this.client.request(error.config)
        }
        
        if (error.response?.status === 401) {
          // Token expired, refresh and retry
          this.accessToken = undefined
          await this.ensureValidToken()
          error.config.headers.Authorization = `Bearer ${this.accessToken}`
          return this.client.request(error.config)
        }
        
        throw error
      }
    )
  }

  async getSubredditPosts(
    subreddit: string,
    options: {
      timeframe?: '24h' | 'week' | 'month' | 'year'
      limit?: number
      after?: string
    } = {}
  ): Promise<{
    posts: RedditPost[]
    after?: string
    hasMore: boolean
  }> {
    const { timeframe = 'month', limit = 100, after } = options
    
    return this.circuitBreaker.execute(async () => {
      const response = await this.client.get(`/r/${subreddit}/hot`, {
        params: {
          t: timeframe,
          limit: Math.min(limit, 100),
          after,
          raw_json: 1
        }
      })

      const posts: RedditPost[] = response.data.data.children
        .filter((child: any) => child.kind === 't3')
        .map((child: any) => ({
          id: child.data.id,
          subreddit: child.data.subreddit,
          title: child.data.title,
          selftext: child.data.selftext,
          author: child.data.author,
          score: child.data.score,
          num_comments: child.data.num_comments,
          created_utc: child.data.created_utc,
          url: child.data.url,
          permalink: child.data.permalink
        }))

      return {
        posts,
        after: response.data.data.after,
        hasMore: !!response.data.data.after
      }
    })
  }
}
```
