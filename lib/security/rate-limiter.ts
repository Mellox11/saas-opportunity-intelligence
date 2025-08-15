import { NextRequest, NextResponse } from 'next/server'
import { ApiErrorHandler } from '@/lib/utils/api-response'
import { AppLogger } from '@/lib/observability/logger'
import { createCorrelatedLogger } from '@/lib/middleware/correlation'

interface RateLimiterOptions {
  windowMs: number
  maxRequests: number
  name?: string // For logging and identification
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
    firstRequest: number
    blockedCount: number
  }
}

interface RateLimitResult {
  allowed: boolean
  count: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

export class RateLimiter {
  private store: RateLimitStore = {}
  private windowMs: number
  private maxRequests: number
  private name: string
  private skipSuccessfulRequests: boolean
  private skipFailedRequests: boolean
  
  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs
    this.maxRequests = options.maxRequests
    this.name = options.name || 'rate-limiter'
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false
    this.skipFailedRequests = options.skipFailedRequests || false
  }
  
  /**
   * Enhanced rate limiting check with detailed result
   */
  checkRequest(identifier: string): RateLimitResult {
    const now = Date.now()
    const record = this.store[identifier]
    
    // Initialize or reset window
    if (!record || now > record.resetTime) {
      this.store[identifier] = {
        count: 1,
        resetTime: now + this.windowMs,
        firstRequest: now,
        blockedCount: 0
      }
      
      return {
        allowed: true,
        count: 1,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs
      }
    }
    
    // Check if rate limit exceeded
    if (record.count >= this.maxRequests) {
      record.blockedCount++
      
      // Log rate limit violation
      AppLogger.warn('Rate limit exceeded', {
        service: 'rate-limiter',
        operation: 'rate_limit_exceeded',
        metadata: {
          limiterName: this.name,
          identifier: identifier.length > 15 ? identifier.substring(0, 15) + '...' : identifier,
          count: record.count,
          maxRequests: this.maxRequests,
          windowMs: this.windowMs,
          blockedCount: record.blockedCount,
          resetTime: record.resetTime
        }
      })
      
      return {
        allowed: false,
        count: record.count,
        remaining: 0,
        resetTime: record.resetTime,
        retryAfter: record.resetTime - now
      }
    }
    
    // Increment counter
    record.count++
    
    return {
      allowed: true,
      count: record.count,
      remaining: Math.max(0, this.maxRequests - record.count),
      resetTime: record.resetTime
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  check(identifier: string): boolean {
    return this.checkRequest(identifier).allowed
  }
  
  reset(identifier: string) {
    delete this.store[identifier]
  }
  
  getRetryAfter(identifier: string): number {
    const record = this.store[identifier]
    if (!record) return 0
    return Math.max(0, record.resetTime - Date.now())
  }

  /**
   * Get rate limit status without incrementing counter
   */
  getStatus(identifier: string): RateLimitResult {
    const now = Date.now()
    const record = this.store[identifier]
    
    if (!record || now > record.resetTime) {
      return {
        allowed: true,
        count: 0,
        remaining: this.maxRequests,
        resetTime: now + this.windowMs
      }
    }
    
    return {
      allowed: record.count < this.maxRequests,
      count: record.count,
      remaining: Math.max(0, this.maxRequests - record.count),
      resetTime: record.resetTime,
      retryAfter: record.count >= this.maxRequests ? record.resetTime - now : undefined
    }
  }
  
  /**
   * Clean up expired entries periodically with enhanced logging
   */
  cleanup() {
    const now = Date.now()
    let cleanedCount = 0
    let totalBlocked = 0
    
    for (const key in this.store) {
      const record = this.store[key]
      if (record.resetTime < now) {
        totalBlocked += record.blockedCount
        cleanedCount++
        delete this.store[key]
      }
    }
    
    if (cleanedCount > 0) {
      AppLogger.debug('Rate limiter cleanup completed', {
        service: 'rate-limiter',
        operation: 'cleanup',
        metadata: {
          limiterName: this.name,
          cleanedEntries: cleanedCount,
          totalBlockedRequests: totalBlocked,
          remainingEntries: Object.keys(this.store).length
        }
      })
    }
  }

  /**
   * Get statistics about the rate limiter
   */
  getStats(): {
    activeIdentifiers: number
    totalBlocked: number
    averageRequestsPerIdentifier: number
  } {
    const identifiers = Object.keys(this.store)
    const totalBlocked = identifiers.reduce((sum, key) => sum + this.store[key].blockedCount, 0)
    const totalRequests = identifiers.reduce((sum, key) => sum + this.store[key].count, 0)
    
    return {
      activeIdentifiers: identifiers.length,
      totalBlocked,
      averageRequestsPerIdentifier: identifiers.length > 0 ? totalRequests / identifiers.length : 0
    }
  }
}

// Authentication endpoints - strict limits
export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  name: 'auth-limiter',
  skipSuccessfulRequests: false // Count all auth attempts
})

// General API endpoints - moderate limits
export const apiRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requests per 15 minutes
  name: 'api-limiter',
  skipSuccessfulRequests: false
})

// Analysis endpoints - expensive operations
export const analysisRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 analyses per hour
  name: 'analysis-limiter',
  skipSuccessfulRequests: false
})

// Cost estimation - medium usage
export const costEstimationRateLimiter = new RateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 20, // 20 estimations per 5 minutes
  name: 'cost-estimation-limiter'
})

// Reddit API calls - external service limits
export const redditRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 reddit API calls per minute
  name: 'reddit-api-limiter'
})

// Password reset - security sensitive
export const passwordResetRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 password reset attempts per hour
  name: 'password-reset-limiter'
})

/**
 * Enhanced rate limiting middleware with comprehensive logging and headers
 */
export function withRateLimit(limiter: RateLimiter, options?: {
  keyGenerator?: (req: NextRequest) => string
  skipCondition?: (req: NextRequest) => boolean
  onLimitReached?: (identifier: string, result: RateLimitResult) => void
}) {
  return (handler: Function) => {
    return async (req: NextRequest, ...args: any[]) => {
      const logger = createCorrelatedLogger('rate-limiter', 'check_limit')
      
      // Check skip condition
      if (options?.skipCondition && options.skipCondition(req)) {
        return handler(req, ...args)
      }
      
      // Generate identifier
      let identifier: string
      if (options?.keyGenerator) {
        identifier = options.keyGenerator(req)
      } else {
        // Enhanced IP detection
        identifier = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') ||
                    req.headers.get('cf-connecting-ip') || // Cloudflare
                    req.headers.get('x-client-ip') ||
                    'unknown'
        
        // If x-forwarded-for contains multiple IPs, take the first one (original client)
        if (identifier.includes(',')) {
          identifier = identifier.split(',')[0].trim()
        }
      }
      
      // Periodic cleanup to prevent memory leaks
      if (Math.random() < 0.01) { // 1% chance to trigger cleanup
        limiter.cleanup()
      }
      
      // Check rate limit
      const result = limiter.checkRequest(identifier)
      
      // Log rate limit check
      logger.debug('Rate limit check', {
        metadata: {
          limiterName: limiter.name,
          identifier: identifier.length > 15 ? identifier.substring(0, 15) + '...' : identifier,
          allowed: result.allowed,
          count: result.count,
          remaining: result.remaining,
          resetTime: new Date(result.resetTime).toISOString(),
          method: req.method,
          url: req.url
        }
      })
      
      // Handle rate limit exceeded
      if (!result.allowed) {
        // Custom callback for limit reached
        if (options?.onLimitReached) {
          options.onLimitReached(identifier, result)
        }
        
        // Log business event for security monitoring
        AppLogger.business('Rate limit exceeded', {
          service: 'rate-limiter',
          operation: 'rate_limit_exceeded',
          businessEvent: 'security_event',
          metadata: {
            limiterName: limiter.name,
            identifier: identifier.length > 15 ? identifier.substring(0, 15) + '...' : identifier,
            method: req.method,
            url: req.url,
            userAgent: req.headers.get('user-agent'),
            retryAfter: result.retryAfter
          }
        })
        
        const response = ApiErrorHandler.rateLimited(result.retryAfter || 0)
        
        // Add rate limit headers
        response.headers.set('X-RateLimit-Limit', limiter.maxRequests.toString())
        response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
        response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())
        if (result.retryAfter) {
          response.headers.set('Retry-After', Math.ceil(result.retryAfter / 1000).toString())
        }
        
        return response
      }
      
      // Execute handler
      const response = await handler(req, ...args)
      
      // Add rate limit headers to successful responses
      if (response instanceof NextResponse) {
        response.headers.set('X-RateLimit-Limit', limiter.maxRequests.toString())
        response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
        response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())
      }
      
      return response
    }
  }
}

/**
 * User-based rate limiting (requires authentication)
 */
export function withUserRateLimit(limiter: RateLimiter) {
  return withRateLimit(limiter, {
    keyGenerator: (req: NextRequest) => {
      // Try to get user ID from various sources
      const userId = req.headers.get('x-user-id') || 
                    req.headers.get('authorization')?.split(' ')[1] || // Extract from Bearer token
                    'anonymous'
      return `user:${userId}`
    }
  })
}

/**
 * IP + User combined rate limiting
 */
export function withHybridRateLimit(limiter: RateLimiter) {
  return withRateLimit(limiter, {
    keyGenerator: (req: NextRequest) => {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                req.headers.get('x-real-ip') || 
                'unknown'
      const userId = req.headers.get('x-user-id') || 'anonymous'
      return `${ip}:${userId}`
    }
  })
}