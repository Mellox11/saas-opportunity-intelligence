import { AppLogger } from '@/lib/observability/logger'
import { Redis } from 'ioredis'

export interface CacheConfig {
  redisUrl?: string
  defaultTtl: number // Time to live in seconds
  maxSize: number // Maximum cache size in MB
  keyPrefix: string
  enableCompression: boolean
  enableMetrics: boolean
}

export interface CacheMetrics {
  hits: number
  misses: number
  sets: number
  deletes: number
  hitRate: number
  totalRequests: number
  memoryUsage: number
  keyCount: number
  lastUpdated: Date
}

export interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl: number
  size: number
  accessCount: number
  lastAccessed: number
}

export class CacheManager {
  private redis?: Redis
  private memoryCache: Map<string, CacheEntry<any>> = new Map()
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
    totalRequests: 0,
    memoryUsage: 0,
    keyCount: 0,
    lastUpdated: new Date()
  }
  private maxMemorySize: number
  private cleanupInterval?: NodeJS.Timeout

  constructor(private config: CacheConfig) {
    this.maxMemorySize = config.maxSize * 1024 * 1024 // Convert MB to bytes
    
    // Initialize Redis if URL provided
    if (config.redisUrl) {
      this.initializeRedis()
    }

    // Start cleanup interval for memory cache
    this.startCleanup()

    AppLogger.info('Cache manager initialized', {
      service: 'cache-manager',
      operation: 'initialization',
      metadata: {
        config: {
          hasRedis: !!config.redisUrl,
          defaultTtl: config.defaultTtl,
          maxSize: config.maxSize,
          keyPrefix: config.keyPrefix
        }
      }
    })
  }

  /**
   * Initialize Redis connection
   */
  private initializeRedis(): void {
    try {
      this.redis = new Redis(this.config.redisUrl!, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000
      })

      this.redis.on('connect', () => {
        AppLogger.info('Redis cache connected', {
          service: 'cache-manager',
          operation: 'redis_connected'
        })
      })

      this.redis.on('error', (error) => {
        AppLogger.error('Redis cache error', {
          service: 'cache-manager',
          operation: 'redis_error',
          metadata: {
            error: error.message
          }
        })
      })

      this.redis.on('reconnecting', () => {
        AppLogger.warn('Redis cache reconnecting', {
          service: 'cache-manager',
          operation: 'redis_reconnecting'
        })
      })

    } catch (error) {
      AppLogger.error('Failed to initialize Redis', {
        service: 'cache-manager',
        operation: 'redis_init_failed',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * Get value from cache
   */
  public async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getFullKey(key)
    this.metrics.totalRequests++

    try {
      // Try Redis first if available
      if (this.redis) {
        const redisValue = await this.getFromRedis<T>(fullKey)
        if (redisValue !== null) {
          this.metrics.hits++
          this.updateMetrics()
          return redisValue
        }
      }

      // Try memory cache
      const memoryEntry = this.memoryCache.get(fullKey)
      if (memoryEntry && this.isValidEntry(memoryEntry)) {
        memoryEntry.accessCount++
        memoryEntry.lastAccessed = Date.now()
        this.metrics.hits++
        this.updateMetrics()
        
        AppLogger.debug('Cache hit (memory)', {
          service: 'cache-manager',
          operation: 'cache_hit',
          metadata: {
            key: fullKey,
            source: 'memory'
          }
        })
        
        return memoryEntry.value
      }

      // Cache miss
      this.metrics.misses++
      this.updateMetrics()
      
      AppLogger.debug('Cache miss', {
        service: 'cache-manager',
        operation: 'cache_miss',
        metadata: {
          key: fullKey
        }
      })
      
      return null

    } catch (error) {
      AppLogger.error('Cache get failed', {
        service: 'cache-manager',
        operation: 'cache_get_error',
        metadata: {
          key: fullKey,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      return null
    }
  }

  /**
   * Set value in cache
   */
  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = this.getFullKey(key)
    const finalTtl = ttl || this.config.defaultTtl
    this.metrics.sets++

    try {
      const serializedValue = JSON.stringify(value)
      const size = Buffer.byteLength(serializedValue, 'utf8')

      // Set in Redis if available
      if (this.redis) {
        await this.setInRedis(fullKey, serializedValue, finalTtl)
      }

      // Set in memory cache
      await this.setInMemory(fullKey, value, finalTtl, size)

      this.updateMetrics()

      AppLogger.debug('Cache set', {
        service: 'cache-manager',
        operation: 'cache_set',
        metadata: {
          key: fullKey,
          size,
          ttl: finalTtl
        }
      })

    } catch (error) {
      AppLogger.error('Cache set failed', {
        service: 'cache-manager',
        operation: 'cache_set_error',
        metadata: {
          key: fullKey,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * Delete value from cache
   */
  public async delete(key: string): Promise<void> {
    const fullKey = this.getFullKey(key)
    this.metrics.deletes++

    try {
      // Delete from Redis
      if (this.redis) {
        await this.redis.del(fullKey)
      }

      // Delete from memory cache
      this.memoryCache.delete(fullKey)

      this.updateMetrics()

      AppLogger.debug('Cache delete', {
        service: 'cache-manager',
        operation: 'cache_delete',
        metadata: {
          key: fullKey
        }
      })

    } catch (error) {
      AppLogger.error('Cache delete failed', {
        service: 'cache-manager',
        operation: 'cache_delete_error',
        metadata: {
          key: fullKey,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * Clear all cache
   */
  public async clear(): Promise<void> {
    try {
      // Clear Redis
      if (this.redis) {
        const pattern = `${this.config.keyPrefix}*`
        const keys = await this.redis.keys(pattern)
        if (keys.length > 0) {
          await this.redis.del(...keys)
        }
      }

      // Clear memory cache
      this.memoryCache.clear()

      this.updateMetrics()

      AppLogger.info('Cache cleared', {
        service: 'cache-manager',
        operation: 'cache_cleared'
      })

    } catch (error) {
      AppLogger.error('Cache clear failed', {
        service: 'cache-manager',
        operation: 'cache_clear_error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * Get or set with cache-aside pattern
   */
  public async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await fetchFunction()
    await this.set(key, value, ttl)
    return value
  }

  /**
   * Get cache metrics
   */
  public getMetrics(): CacheMetrics {
    this.updateMetrics()
    return { ...this.metrics }
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      totalRequests: 0,
      memoryUsage: 0,
      keyCount: 0,
      lastUpdated: new Date()
    }

    AppLogger.info('Cache metrics reset', {
      service: 'cache-manager',
      operation: 'metrics_reset'
    })
  }

  /**
   * Get full key with prefix
   */
  private getFullKey(key: string): string {
    return `${this.config.keyPrefix}:${key}`
  }

  /**
   * Get value from Redis
   */
  private async getFromRedis<T>(key: string): Promise<T | null> {
    if (!this.redis) return null

    try {
      const value = await this.redis.get(key)
      if (value) {
        return JSON.parse(value)
      }
      return null
    } catch (error) {
      AppLogger.warn('Redis get failed, falling back to memory cache', {
        service: 'cache-manager',
        operation: 'redis_get_failed',
        metadata: {
          key,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      return null
    }
  }

  /**
   * Set value in Redis
   */
  private async setInRedis(key: string, value: string, ttl: number): Promise<void> {
    if (!this.redis) return

    try {
      await this.redis.setex(key, ttl, value)
    } catch (error) {
      AppLogger.warn('Redis set failed', {
        service: 'cache-manager',
        operation: 'redis_set_failed',
        metadata: {
          key,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * Set value in memory cache
   */
  private async setInMemory<T>(key: string, value: T, ttl: number, size: number): Promise<void> {
    // Check if we need to free up space
    await this.ensureMemorySpace(size)

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl * 1000, // Convert to milliseconds
      size,
      accessCount: 0,
      lastAccessed: Date.now()
    }

    this.memoryCache.set(key, entry)
  }

  /**
   * Check if cache entry is still valid
   */
  private isValidEntry(entry: CacheEntry<any>): boolean {
    const now = Date.now()
    return (now - entry.timestamp) < entry.ttl
  }

  /**
   * Ensure memory space for new entry
   */
  private async ensureMemorySpace(requiredSize: number): Promise<void> {
    const currentSize = this.calculateMemoryUsage()
    
    if (currentSize + requiredSize <= this.maxMemorySize) {
      return
    }

    // Remove expired entries first
    this.removeExpiredEntries()

    // If still not enough space, remove least recently used entries
    const stillCurrentSize = this.calculateMemoryUsage()
    if (stillCurrentSize + requiredSize > this.maxMemorySize) {
      this.removeLRUEntries(requiredSize)
    }
  }

  /**
   * Remove expired entries
   */
  private removeExpiredEntries(): void {
    const now = Date.now()
    let removedCount = 0

    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isValidEntry(entry)) {
        this.memoryCache.delete(key)
        removedCount++
      }
    }

    if (removedCount > 0) {
      AppLogger.debug('Expired cache entries removed', {
        service: 'cache-manager',
        operation: 'expired_entries_removed',
        metadata: {
          removedCount
        }
      })
    }
  }

  /**
   * Remove least recently used entries
   */
  private removeLRUEntries(requiredSize: number): void {
    const entries = Array.from(this.memoryCache.entries())
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)

    let freedSize = 0
    let removedCount = 0

    for (const [key, entry] of entries) {
      this.memoryCache.delete(key)
      freedSize += entry.size
      removedCount++

      if (freedSize >= requiredSize) {
        break
      }
    }

    AppLogger.debug('LRU cache entries removed', {
      service: 'cache-manager',
      operation: 'lru_entries_removed',
      metadata: {
        removedCount,
        freedSize
      }
    })
  }

  /**
   * Calculate current memory usage
   */
  private calculateMemoryUsage(): number {
    let totalSize = 0
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size
    }
    return totalSize
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    this.metrics.hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.hits / this.metrics.totalRequests) * 100 
      : 0
    this.metrics.memoryUsage = this.calculateMemoryUsage()
    this.metrics.keyCount = this.memoryCache.size
    this.metrics.lastUpdated = new Date()
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.removeExpiredEntries()
    }, 60000) // Run every minute

    AppLogger.debug('Cache cleanup interval started', {
      service: 'cache-manager',
      operation: 'cleanup_started',
      metadata: {
        interval: '60s'
      }
    })
  }

  /**
   * Stop cleanup interval
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }

    if (this.redis) {
      this.redis.disconnect()
    }

    AppLogger.info('Cache manager destroyed', {
      service: 'cache-manager',
      operation: 'destroyed',
      metadata: {
        finalMetrics: this.getMetrics()
      }
    })
  }
}

// Default cache configuration
export const defaultCacheConfig: CacheConfig = {
  defaultTtl: 3600, // 1 hour
  maxSize: 100, // 100MB
  keyPrefix: 'saas-oi',
  enableCompression: true,
  enableMetrics: true
}

// Singleton instance
export const cacheManager = new CacheManager(defaultCacheConfig)