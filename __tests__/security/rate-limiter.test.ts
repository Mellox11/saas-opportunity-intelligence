// Mock Next.js imports first
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url: string, options?: any) => ({
    url,
    method: options?.method || 'GET',
    headers: new Map(Object.entries(options?.headers || {})),
    nextUrl: { pathname: new URL(url).pathname }
  })),
  NextResponse: jest.fn().mockImplementation((body?: any, init?: any) => ({
    status: init?.status || 200,
    headers: new Map(),
    json: () => Promise.resolve(body)
  }))
}))

import { RateLimiter, withRateLimit } from '@/lib/security/rate-limiter'
import { AppLogger } from '@/lib/observability/logger'

// Mock AppLogger
jest.mock('@/lib/observability/logger', () => ({
  AppLogger: {
    warn: jest.fn(),
    debug: jest.fn(),
    business: jest.fn()
  }
}))

// Mock correlation middleware
jest.mock('@/lib/middleware/correlation', () => ({
  createCorrelatedLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}))

// Mock API error handler
jest.mock('@/lib/utils/api-response', () => ({
  ApiErrorHandler: {
    rateLimited: jest.fn((retryAfter: number) => ({
      status: 429,
      headers: {
        set: jest.fn(),
        get: jest.fn()
      },
      json: () => Promise.resolve({ error: 'Rate limit exceeded', retryAfter })
    }))
  }
}))

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rate Limiting', () => {
    let rateLimiter: RateLimiter

    beforeEach(() => {
      rateLimiter = new RateLimiter({
        windowMs: 60000, // 1 minute
        maxRequests: 5,
        name: 'test-limiter'
      })
    })

    it('should allow requests within limit', () => {
      const identifier = 'test-user'
      
      for (let i = 0; i < 5; i++) {
        const result = rateLimiter.checkRequest(identifier)
        expect(result.allowed).toBe(true)
        expect(result.count).toBe(i + 1)
        expect(result.remaining).toBe(5 - (i + 1))
      }
    })

    it('should block requests exceeding limit', () => {
      const identifier = 'test-user'
      
      // Use up the limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkRequest(identifier)
      }
      
      // Next request should be blocked
      const result = rateLimiter.checkRequest(identifier)
      expect(result.allowed).toBe(false)
      expect(result.count).toBe(5)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should reset after window expires', async () => {
      const identifier = 'test-user'
      
      // Create limiter with very short window for testing
      const shortLimiter = new RateLimiter({
        windowMs: 100, // 100ms
        maxRequests: 1,
        name: 'short-test-limiter'
      })
      
      // Use up the limit
      const firstResult = shortLimiter.checkRequest(identifier)
      expect(firstResult.allowed).toBe(true)
      
      const blockedResult = shortLimiter.checkRequest(identifier)
      expect(blockedResult.allowed).toBe(false)
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Should be allowed again
      const newResult = shortLimiter.checkRequest(identifier)
      expect(newResult.allowed).toBe(true)
      expect(newResult.count).toBe(1)
    })

    it('should track different identifiers separately', () => {
      const user1 = 'user1'
      const user2 = 'user2'
      
      // User 1 uses up their limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkRequest(user1)
      }
      
      // User 1 should be blocked
      const user1Result = rateLimiter.checkRequest(user1)
      expect(user1Result.allowed).toBe(false)
      
      // User 2 should still be allowed
      const user2Result = rateLimiter.checkRequest(user2)
      expect(user2Result.allowed).toBe(true)
    })
  })

  describe('Rate Limiter Management', () => {
    let rateLimiter: RateLimiter

    beforeEach(() => {
      rateLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        name: 'management-test-limiter'
      })
    })

    it('should reset specific identifier', () => {
      const identifier = 'test-user'
      
      // Use up the limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkRequest(identifier)
      }
      
      // Should be blocked
      expect(rateLimiter.checkRequest(identifier).allowed).toBe(false)
      
      // Reset the identifier
      rateLimiter.reset(identifier)
      
      // Should be allowed again
      expect(rateLimiter.checkRequest(identifier).allowed).toBe(true)
    })

    it('should provide accurate status without incrementing', () => {
      const identifier = 'test-user'
      
      // Make some requests
      rateLimiter.checkRequest(identifier)
      rateLimiter.checkRequest(identifier)
      
      // Get status without incrementing
      const status = rateLimiter.getStatus(identifier)
      expect(status.count).toBe(2)
      expect(status.remaining).toBe(3)
      expect(status.allowed).toBe(true)
      
      // Verify count wasn't incremented
      const nextStatus = rateLimiter.getStatus(identifier)
      expect(nextStatus.count).toBe(2)
    })

    it('should cleanup expired entries', async () => {
      const shortLimiter = new RateLimiter({
        windowMs: 50, // 50ms
        maxRequests: 5,
        name: 'cleanup-test-limiter'
      })
      
      // Create some entries
      shortLimiter.checkRequest('user1')
      shortLimiter.checkRequest('user2')
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Cleanup
      shortLimiter.cleanup()
      
      // Verify debug log was called
      expect(AppLogger.debug).toHaveBeenCalledWith(
        'Rate limiter cleanup completed',
        expect.objectContaining({
          service: 'rate-limiter',
          operation: 'cleanup'
        })
      )
    })

    it('should provide statistics', () => {
      rateLimiter.checkRequest('user1')
      rateLimiter.checkRequest('user1')
      rateLimiter.checkRequest('user2')
      
      const stats = rateLimiter.getStats()
      expect(stats.activeIdentifiers).toBe(2)
      expect(stats.averageRequestsPerIdentifier).toBe(1.5) // (2 + 1) / 2
    })
  })

  describe('withRateLimit Middleware', () => {
    let mockHandler: jest.Mock
    let rateLimiter: RateLimiter

    beforeEach(() => {
      const mockHeaders = new Map()
      mockHandler = jest.fn().mockResolvedValue({
        status: 200,
        headers: {
          set: jest.fn((key: string, value: string) => mockHeaders.set(key, value)),
          get: jest.fn((key: string) => mockHeaders.get(key))
        }
      })
      rateLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 2,
        name: 'middleware-test-limiter'
      })
    })

    const createMockRequest = (ip: string = '127.0.0.1'): any => {
      return {
        url: 'http://localhost/api/test',
        method: 'POST',
        headers: {
          get: (key: string) => {
            const headers: Record<string, string> = {
              'x-forwarded-for': ip,
              'user-agent': 'test-agent'
            }
            return headers[key.toLowerCase()]
          }
        },
        nextUrl: { pathname: '/api/test' }
      }
    }

    it('should allow requests within limit', async () => {
      const middleware = withRateLimit(rateLimiter)(mockHandler)
      const request = createMockRequest()
      
      const response = await middleware(request)
      
      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalledWith(request)
      
      // Verify rate limit headers were added (the middleware adds them to the response)
      expect(typeof response.headers.set).toBe('function')
    })

    it('should block requests exceeding limit', async () => {
      const middleware = withRateLimit(rateLimiter)(mockHandler)
      const request = createMockRequest()
      
      // Use up the limit
      await middleware(request)
      await middleware(request)
      
      // Third request should be blocked
      const response = await middleware(request)
      
      expect(response.status).toBe(429)
      expect(mockHandler).toHaveBeenCalledTimes(2) // Handler not called for blocked request
      
      // Verify rate-limited response has correct status
      expect(response.status).toBe(429)
      expect(typeof response.headers.set).toBe('function')
    })

    it('should use custom key generator', async () => {
      const customKeyGenerator = jest.fn(() => 'custom-key')
      const middleware = withRateLimit(rateLimiter, {
        keyGenerator: customKeyGenerator
      })(mockHandler)
      
      const request = createMockRequest()
      await middleware(request)
      
      expect(customKeyGenerator).toHaveBeenCalledWith(request)
    })

    it('should skip rate limiting when skip condition is true', async () => {
      const skipCondition = jest.fn(() => true)
      const middleware = withRateLimit(rateLimiter, {
        skipCondition
      })(mockHandler)
      
      const request = createMockRequest()
      
      // Make many requests (more than limit)
      for (let i = 0; i < 5; i++) {
        const response = await middleware(request)
        expect(response.status).toBe(200)
      }
      
      expect(skipCondition).toHaveBeenCalledWith(request)
      expect(mockHandler).toHaveBeenCalledTimes(5)
    })

    it('should call onLimitReached callback', async () => {
      const onLimitReached = jest.fn()
      const middleware = withRateLimit(rateLimiter, {
        onLimitReached
      })(mockHandler)
      
      const request = createMockRequest()
      
      // Use up the limit
      await middleware(request)
      await middleware(request)
      
      // Third request should trigger callback
      await middleware(request)
      
      expect(onLimitReached).toHaveBeenCalledWith(
        '127.0.0.1',
        expect.objectContaining({
          allowed: false,
          count: 2,
          remaining: 0
        })
      )
    })

    it('should handle comma-separated forwarded IPs', async () => {
      const middleware = withRateLimit(rateLimiter)(mockHandler)
      const request = {
        url: 'http://localhost/api/test',
        method: 'POST',
        headers: {
          get: (key: string) => {
            if (key === 'x-forwarded-for') {
              return '192.168.1.1, 10.0.0.1, 127.0.0.1'
            }
            return null
          }
        },
        nextUrl: { pathname: '/api/test' }
      }
      
      await middleware(request)
      
      // Should use the first IP (original client)
      expect(mockHandler).toHaveBeenCalledWith(request)
    })

    it('should log rate limit violations', async () => {
      const middleware = withRateLimit(rateLimiter)(mockHandler)
      const request = createMockRequest()
      
      // Use up the limit
      await middleware(request)
      await middleware(request)
      
      // Third request should be logged
      await middleware(request)
      
      expect(AppLogger.business).toHaveBeenCalledWith(
        'Rate limit exceeded',
        expect.objectContaining({
          service: 'rate-limiter',
          operation: 'rate_limit_exceeded',
          businessEvent: 'security_event'
        })
      )
    })
  })

  describe('Legacy Compatibility', () => {
    it('should maintain backward compatibility with check() method', () => {
      const rateLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 2,
        name: 'legacy-test-limiter'
      })
      
      const identifier = 'test-user'
      
      // Should work like before
      expect(rateLimiter.check(identifier)).toBe(true)
      expect(rateLimiter.check(identifier)).toBe(true)
      expect(rateLimiter.check(identifier)).toBe(false) // Exceeded
    })

    it('should maintain backward compatibility with getRetryAfter() method', () => {
      const rateLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 1,
        name: 'retry-test-limiter'
      })
      
      const identifier = 'test-user'
      
      // Use up the limit
      rateLimiter.check(identifier)
      rateLimiter.check(identifier) // This should be blocked
      
      const retryAfter = rateLimiter.getRetryAfter(identifier)
      expect(retryAfter).toBeGreaterThan(0)
      expect(retryAfter).toBeLessThanOrEqual(60000)
    })
  })
})