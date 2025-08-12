import { NextRequest, NextResponse } from 'next/server'
import { ApiErrorHandler } from '@/lib/utils/api-response'

interface RateLimiterOptions {
  windowMs: number
  maxRequests: number
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

export class RateLimiter {
  private store: RateLimitStore = {}
  private windowMs: number
  private maxRequests: number
  
  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs
    this.maxRequests = options.maxRequests
  }
  
  check(identifier: string): boolean {
    const now = Date.now()
    const record = this.store[identifier]
    
    if (!record || now > record.resetTime) {
      this.store[identifier] = {
        count: 1,
        resetTime: now + this.windowMs
      }
      return true
    }
    
    if (record.count >= this.maxRequests) {
      return false
    }
    
    record.count++
    return true
  }
  
  reset(identifier: string) {
    delete this.store[identifier]
  }
  
  getRetryAfter(identifier: string): number {
    const record = this.store[identifier]
    if (!record) return 0
    return Math.max(0, record.resetTime - Date.now())
  }
  
  // Clean up expired entries periodically
  cleanup() {
    const now = Date.now()
    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        delete this.store[key]
      }
    }
  }
}

export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
})

export const apiRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requests per 15 minutes
})

// Middleware helper with improved IP detection
export function withRateLimit(limiter: RateLimiter) {
  return (handler: Function) => {
    return async (req: NextRequest, ...args: any[]) => {
      // Better IP detection - handles comma-separated forwarded IPs
      let identifier = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') ||
                      req.headers.get('cf-connecting-ip') || // Cloudflare
                      'unknown'
      
      // If x-forwarded-for contains multiple IPs, take the first one (original client)
      if (identifier.includes(',')) {
        identifier = identifier.split(',')[0].trim()
      }
      
      // Periodic cleanup to prevent memory leaks
      if (Math.random() < 0.01) { // 1% chance to trigger cleanup
        limiter.cleanup()
      }
      
      if (!limiter.check(identifier)) {
        return ApiErrorHandler.rateLimited(limiter.getRetryAfter(identifier))
      }
      
      return handler(req, ...args)
    }
  }
}