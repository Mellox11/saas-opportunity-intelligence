import { NextRequest, NextResponse } from 'next/server'
import { AppLogger } from '@/lib/observability/logger'

/**
 * Edge Runtime compatible UUID generation
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Request context stored in request headers for Edge Runtime compatibility
 */
export interface RequestContext {
  correlationId: string
  requestId: string
  userId?: string
  sessionId?: string
  startTime: number
  userAgent?: string
  ip?: string
}

/**
 * Store correlation context in request headers (Edge Runtime compatible)
 */
const correlationContext = new Map<string, RequestContext>()

/**
 * Correlation middleware for request tracking
 * Adds correlation IDs and request context to all API calls
 */
export class CorrelationMiddleware {
  /**
   * Process request and inject correlation context
   */
  static async process(
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = performance.now()
    
    // Generate or extract correlation ID
    const correlationId = request.headers.get('x-correlation-id') || 
                         request.headers.get('x-request-id') ||
                         generateUUID()
    
    const requestId = generateUUID()
    
    // Extract user context (will be enhanced after auth middleware)
    const userAgent = request.headers.get('user-agent') || undefined
    const ip = this.extractClientIP(request)
    
    // Create request context
    const context: RequestContext = {
      correlationId,
      requestId,
      startTime,
      userAgent,
      ip
    }

    // Log incoming request
    AppLogger.info('Incoming request', {
      service: 'api-gateway',
      operation: 'request_start',
      correlationId,
      requestId,
      httpMethod: request.method,
      metadata: {
        url: request.url,
        userAgent,
        ip
      }
    })

    try {
      // Store context for Edge Runtime compatibility
      correlationContext.set(correlationId, context)
      
      // Execute handler
      const response = await handler(request)

      // Add correlation headers to response
      response.headers.set('x-correlation-id', correlationId)
      response.headers.set('x-request-id', requestId)

      // Log successful response
      const duration = performance.now() - startTime
      AppLogger.http('Request completed', {
        service: 'api-gateway',
        operation: 'request_complete',
        correlationId,
        requestId,
        httpMethod: request.method,
        httpStatus: response.status,
        duration,
        metadata: {
          url: request.url,
          responseSize: response.headers.get('content-length')
        }
      })

      return response
    } catch (error) {
      // Log error response
      const duration = performance.now() - startTime
      AppLogger.error('Request failed', {
        service: 'api-gateway',
        operation: 'request_error',
        correlationId,
        requestId,
        httpMethod: request.method,
        duration,
        metadata: {
          url: request.url
        }
      }, error as Error)

      throw error
    } finally {
      // Cleanup context to prevent memory leaks
      correlationContext.delete(correlationId)
    }
  }

  /**
   * Get current request context by correlation ID
   */
  static getContext(correlationId: string): RequestContext | undefined {
    return correlationContext.get(correlationId)
  }

  /**
   * Get correlation ID from request headers
   */
  static getCorrelationId(request?: NextRequest): string | undefined {
    if (!request) return undefined
    return request.headers.get('x-correlation-id') || undefined
  }

  /**
   * Update context with user information after authentication
   */
  static updateUserContext(correlationId: string, userId: string, sessionId?: string): void {
    const context = correlationContext.get(correlationId)
    if (context) {
      context.userId = userId
      context.sessionId = sessionId
    }
  }

  /**
   * Extract client IP from request headers
   */
  private static extractClientIP(request: NextRequest): string {
    // Check common proxy headers in order of preference
    const headers = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'cf-connecting-ip', // Cloudflare
      'x-forwarded',
      'forwarded-for',
      'forwarded'
    ]

    for (const header of headers) {
      const value = request.headers.get(header)
      if (value) {
        // x-forwarded-for can contain multiple IPs, take the first one
        return value.split(',')[0].trim()
      }
    }

    // Fallback to request IP (may not be available in all environments)
    return request.ip || 'unknown'
  }
}

/**
 * Create a logger with correlation context (simplified for Edge Runtime)
 */
export function createCorrelatedLogger(service: string, operation: string, correlationId?: string) {
  return AppLogger.createChild({
    service,
    operation,
    correlationId: correlationId || generateUUID()
  })
}

/**
 * Decorator for automatic correlation logging
 */
export function withCorrelation(service: string, operation: string) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!

    descriptor.value = (async function (this: any, ...args: any[]) {
      const logger = createCorrelatedLogger(service, operation)
      const start = performance.now()

      try {
        logger.debug(`Starting ${operation}`)
        const result = await method.apply(this, args)
        const duration = performance.now() - start
        
        logger.performance(`Completed ${operation}`, duration)
        return result
      } catch (error) {
        const duration = performance.now() - start
        logger.error(`Failed ${operation}`, { duration }, error as Error)
        throw error
      }
    }) as any

    return descriptor
  }
}