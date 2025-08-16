import { CircuitBreaker, CircuitBreakerConfig, CircuitState } from './circuit-breaker'
import { AppLogger } from '@/lib/observability/logger'

// Predefined circuit breaker configurations
export const CIRCUIT_BREAKER_CONFIGS: Record<string, CircuitBreakerConfig> = {
  REDDIT_API: {
    name: 'reddit-api',
    failureThreshold: 0.5, // 50% failure rate
    resetTimeout: 60000, // 1 minute
    monitoringPeriod: 60000, // 1 minute
    minimumThroughput: 5 // Minimum 5 requests before evaluating
  },
  OPENAI_API: {
    name: 'openai-api',
    failureThreshold: 0.4, // 40% failure rate (more sensitive)
    resetTimeout: 30000, // 30 seconds
    monitoringPeriod: 60000, // 1 minute
    minimumThroughput: 3 // Minimum 3 requests before evaluating
  },
  DATABASE: {
    name: 'database',
    failureThreshold: 0.3, // 30% failure rate (very sensitive)
    resetTimeout: 10000, // 10 seconds
    monitoringPeriod: 30000, // 30 seconds
    minimumThroughput: 10 // Minimum 10 requests before evaluating
  },
  PINECONE_API: {
    name: 'pinecone-api',
    failureThreshold: 0.5, // 50% failure rate
    resetTimeout: 45000, // 45 seconds
    monitoringPeriod: 60000, // 1 minute
    minimumThroughput: 3 // Minimum 3 requests before evaluating
  }
}

export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry
  private breakers: Map<string, CircuitBreaker<any>> = new Map()
  private monitoringInterval?: NodeJS.Timeout

  private constructor() {
    this.initializeDefaultBreakers()
    this.startMonitoring()
  }

  public static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry()
    }
    return CircuitBreakerRegistry.instance
  }

  private initializeDefaultBreakers(): void {
    Object.values(CIRCUIT_BREAKER_CONFIGS).forEach(config => {
      this.breakers.set(config.name, new CircuitBreaker(config))
    })

    AppLogger.info('Circuit breakers initialized', {
      service: 'circuit-breaker-registry',
      operation: 'initialization',
      metadata: {
        breakerCount: this.breakers.size,
        breakers: Array.from(this.breakers.keys())
      }
    })
  }

  public getBreaker(name: string): CircuitBreaker<any> {
    const breaker = this.breakers.get(name)
    if (!breaker) {
      throw new Error(`Circuit breaker '${name}' not found`)
    }
    return breaker
  }

  public createBreaker(config: CircuitBreakerConfig): CircuitBreaker<any> {
    if (this.breakers.has(config.name)) {
      throw new Error(`Circuit breaker '${config.name}' already exists`)
    }

    const breaker = new CircuitBreaker(config)
    this.breakers.set(config.name, breaker)

    AppLogger.info('Circuit breaker created', {
      service: 'circuit-breaker-registry',
      operation: 'breaker_created',
      metadata: {
        breakerName: config.name,
        config
      }
    })

    return breaker
  }

  public removeBreaker(name: string): boolean {
    const removed = this.breakers.delete(name)
    if (removed) {
      AppLogger.info('Circuit breaker removed', {
        service: 'circuit-breaker-registry',
        operation: 'breaker_removed',
        metadata: {
          breakerName: name
        }
      })
    }
    return removed
  }

  public getAllBreakers(): Map<string, CircuitBreaker<any>> {
    return new Map(this.breakers)
  }

  public getHealthStatus(): Record<string, {
    state: CircuitState
    isHealthy: boolean
    metrics: any
    config: CircuitBreakerConfig
  }> {
    const status: any = {}

    this.breakers.forEach((breaker, name) => {
      status[name] = {
        state: breaker.getState(),
        isHealthy: breaker.isHealthy(),
        metrics: breaker.getMetrics(),
        config: breaker.getConfig()
      }
    })

    return status
  }

  public resetAllBreakers(): void {
    this.breakers.forEach((breaker, name) => {
      breaker.reset()
    })

    AppLogger.info('All circuit breakers reset', {
      service: 'circuit-breaker-registry',
      operation: 'reset_all',
      metadata: {
        breakerCount: this.breakers.size
      }
    })
  }

  public resetBreaker(name: string): boolean {
    const breaker = this.breakers.get(name)
    if (breaker) {
      breaker.reset()
      AppLogger.info('Circuit breaker reset', {
        service: 'circuit-breaker-registry',
        operation: 'reset_breaker',
        metadata: {
          breakerName: name
        }
      })
      return true
    }
    return false
  }

  private startMonitoring(): void {
    // Monitor circuit breakers every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks()
    }, 30000)

    AppLogger.info('Circuit breaker monitoring started', {
      service: 'circuit-breaker-registry',
      operation: 'monitoring_started',
      metadata: {
        interval: '30s'
      }
    })
  }

  private performHealthChecks(): void {
    const unhealthyBreakers: string[] = []
    const openBreakers: string[] = []

    this.breakers.forEach((breaker, name) => {
      const state = breaker.getState()
      const isHealthy = breaker.isHealthy()

      if (state === CircuitState.OPEN) {
        openBreakers.push(name)
      }

      if (!isHealthy) {
        unhealthyBreakers.push(name)
      }
    })

    if (unhealthyBreakers.length > 0 || openBreakers.length > 0) {
      AppLogger.business('Circuit breaker health check alert', {
        service: 'circuit-breaker-registry',
        operation: 'health_check_alert',
        businessEvent: 'system_health',
        metadata: {
          unhealthyBreakers,
          openBreakers,
          totalBreakers: this.breakers.size,
          timestamp: new Date().toISOString()
        }
      })
    }
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
      
      AppLogger.info('Circuit breaker monitoring stopped', {
        service: 'circuit-breaker-registry',
        operation: 'monitoring_stopped'
      })
    }
  }

  // Helper methods for common operations
  public async executeWithRedditBreaker<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    return this.getBreaker('reddit-api').execute(operation, fallback)
  }

  public async executeWithOpenAIBreaker<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    return this.getBreaker('openai-api').execute(operation, fallback)
  }

  public async executeWithDatabaseBreaker<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    return this.getBreaker('database').execute(operation, fallback)
  }

  public async executeWithPineconeBreaker<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    return this.getBreaker('pinecone-api').execute(operation, fallback)
  }
}

// Export singleton instance
export const circuitBreakerRegistry = CircuitBreakerRegistry.getInstance()