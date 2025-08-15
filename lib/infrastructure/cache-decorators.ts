import { cacheManager } from './cache-manager'
import { AppLogger } from '@/lib/observability/logger'

/**
 * Cache configuration for methods
 */
export interface CacheOptions {
  ttl?: number // Time to live in seconds
  keyGenerator?: (...args: any[]) => string
  condition?: (...args: any[]) => boolean
  namespace?: string
}

/**
 * Method decorator for caching
 */
export function Cached(options: CacheOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const namespace = options.namespace || target.constructor.name
      const methodName = propertyKey
      
      // Generate cache key
      const cacheKey = options.keyGenerator 
        ? options.keyGenerator(...args)
        : generateDefaultKey(namespace, methodName, args)

      // Check condition if provided
      if (options.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args)
      }

      try {
        // Try to get from cache
        const result = await cacheManager.getOrSet(
          cacheKey,
          () => originalMethod.apply(this, args),
          options.ttl
        )

        AppLogger.debug('Method result cached', {
          service: 'cache-decorator',
          operation: 'method_cached',
          namespace,
          method: methodName,
          cacheKey,
          hit: true
        })

        return result

      } catch (error) {
        AppLogger.error('Cache decorator failed, executing method directly', {
          service: 'cache-decorator',
          operation: 'cache_decorator_error',
          namespace,
          method: methodName,
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        // Fallback to direct method execution
        return originalMethod.apply(this, args)
      }
    }

    return descriptor
  }
}

/**
 * Cache invalidation decorator
 */
export function CacheInvalidate(options: { pattern?: string; keys?: string[] } = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args)

      try {
        if (options.keys) {
          // Invalidate specific keys
          for (const key of options.keys) {
            await cacheManager.delete(key)
          }
        } else if (options.pattern) {
          // Invalidate by pattern (simplified implementation)
          await cacheManager.clear() // For now, clear all - can be improved with pattern matching
        }

        AppLogger.debug('Cache invalidated after method execution', {
          service: 'cache-decorator',
          operation: 'cache_invalidated',
          method: propertyKey,
          keys: options.keys,
          pattern: options.pattern
        })

      } catch (error) {
        AppLogger.error('Cache invalidation failed', {
          service: 'cache-decorator',
          operation: 'cache_invalidation_error',
          method: propertyKey,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      return result
    }

    return descriptor
  }
}

/**
 * Generate default cache key
 */
function generateDefaultKey(namespace: string, method: string, args: any[]): string {
  const argsHash = hashArgs(args)
  return `${namespace}:${method}:${argsHash}`
}

/**
 * Simple hash function for arguments
 */
function hashArgs(args: any[]): string {
  const str = JSON.stringify(args)
  let hash = 0
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36)
}

/**
 * Cache utilities for manual cache operations
 */
export class CacheUtils {
  /**
   * Cache API response with smart TTL based on status
   */
  static async cacheApiResponse<T>(
    key: string,
    response: T,
    status: number,
    defaultTtl: number = 3600
  ): Promise<void> {
    let ttl = defaultTtl

    // Adjust TTL based on HTTP status
    if (status >= 200 && status < 300) {
      // Success responses - normal TTL
      ttl = defaultTtl
    } else if (status >= 300 && status < 400) {
      // Redirects - shorter TTL
      ttl = Math.min(defaultTtl, 1800) // Max 30 minutes
    } else if (status >= 400 && status < 500) {
      // Client errors - very short TTL
      ttl = 300 // 5 minutes
    } else if (status >= 500) {
      // Server errors - minimal TTL
      ttl = 60 // 1 minute
    }

    await cacheManager.set(key, response, ttl)

    AppLogger.debug('API response cached', {
      service: 'cache-utils',
      operation: 'api_response_cached',
      key,
      status,
      ttl
    })
  }

  /**
   * Cache Reddit API responses with specific handling
   */
  static async cacheRedditResponse<T>(
    subreddit: string,
    timeRange: number,
    response: T
  ): Promise<void> {
    const key = `reddit:${subreddit}:${timeRange}`
    // Reddit data changes relatively slowly, cache for 30 minutes
    await cacheManager.set(key, response, 1800)

    AppLogger.debug('Reddit response cached', {
      service: 'cache-utils',
      operation: 'reddit_response_cached',
      subreddit,
      timeRange,
      key
    })
  }

  /**
   * Cache OpenAI responses with cost-aware TTL
   */
  static async cacheOpenAIResponse<T>(
    prompt: string,
    model: string,
    response: T,
    tokenCount: number
  ): Promise<void> {
    const promptHash = hashArgs([prompt, model])
    const key = `openai:${model}:${promptHash}`
    
    // Cache expensive API calls longer
    const baseTtl = 3600 // 1 hour
    const costMultiplier = Math.min(tokenCount / 1000, 5) // Up to 5x for high token count
    const ttl = Math.floor(baseTtl * (1 + costMultiplier))

    await cacheManager.set(key, response, ttl)

    AppLogger.debug('OpenAI response cached', {
      service: 'cache-utils',
      operation: 'openai_response_cached',
      model,
      tokenCount,
      ttl,
      key
    })
  }

  /**
   * Cache analysis results
   */
  static async cacheAnalysisResult<T>(
    analysisId: string,
    stage: string,
    result: T,
    ttl: number = 7200 // 2 hours
  ): Promise<void> {
    const key = `analysis:${analysisId}:${stage}`
    await cacheManager.set(key, result, ttl)

    AppLogger.debug('Analysis result cached', {
      service: 'cache-utils',
      operation: 'analysis_result_cached',
      analysisId,
      stage,
      ttl
    })
  }

  /**
   * Get cached analysis result
   */
  static async getCachedAnalysisResult<T>(
    analysisId: string,
    stage: string
  ): Promise<T | null> {
    const key = `analysis:${analysisId}:${stage}`
    return await cacheManager.get<T>(key)
  }

  /**
   * Invalidate analysis cache
   */
  static async invalidateAnalysisCache(analysisId: string): Promise<void> {
    // In a real implementation, we'd use pattern matching
    // For now, we'll track analysis-related keys separately
    const stages = ['posts', 'processing', 'opportunities', 'report']
    
    for (const stage of stages) {
      const key = `analysis:${analysisId}:${stage}`
      await cacheManager.delete(key)
    }

    AppLogger.debug('Analysis cache invalidated', {
      service: 'cache-utils',
      operation: 'analysis_cache_invalidated',
      analysisId
    })
  }

  /**
   * Cache configuration data
   */
  static async cacheConfigData<T>(
    configType: string,
    data: T,
    ttl: number = 86400 // 24 hours
  ): Promise<void> {
    const key = `config:${configType}`
    await cacheManager.set(key, data, ttl)
  }

  /**
   * Get cached configuration data
   */
  static async getCachedConfigData<T>(configType: string): Promise<T | null> {
    const key = `config:${configType}`
    return await cacheManager.get<T>(key)
  }
}

/**
 * Cache warming utilities
 */
export class CacheWarmer {
  /**
   * Warm up common Reddit subreddits
   */
  static async warmRedditCache(subreddits: string[]): Promise<void> {
    AppLogger.info('Starting Reddit cache warming', {
      service: 'cache-warmer',
      operation: 'reddit_cache_warming',
      subredditCount: subreddits.length
    })

    // This would be implemented with actual Reddit API calls
    // For now, we'll just log the intent
    for (const subreddit of subreddits) {
      AppLogger.debug('Would warm Reddit cache', {
        service: 'cache-warmer',
        operation: 'reddit_cache_warm',
        subreddit
      })
    }
  }

  /**
   * Warm up common AI classifications
   */
  static async warmAICache(commonPrompts: string[]): Promise<void> {
    AppLogger.info('Starting AI cache warming', {
      service: 'cache-warmer',
      operation: 'ai_cache_warming',
      promptCount: commonPrompts.length
    })

    // This would be implemented with actual AI API calls
    // For now, we'll just log the intent
    for (const prompt of commonPrompts) {
      AppLogger.debug('Would warm AI cache', {
        service: 'cache-warmer',
        operation: 'ai_cache_warm',
        promptLength: prompt.length
      })
    }
  }
}

export { cacheManager }