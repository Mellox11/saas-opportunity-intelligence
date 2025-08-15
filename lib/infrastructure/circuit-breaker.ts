import { AppLogger } from '@/lib/observability/logger'

export interface CircuitBreakerConfig {
  name: string
  failureThreshold: number
  resetTimeout: number
  monitoringPeriod: number
  minimumThroughput: number
}

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, failing fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

interface CircuitMetrics {
  requests: number
  failures: number
  successes: number
  lastFailureTime: number
  lastSuccessTime: number
}

export class CircuitBreaker<T> {
  private state: CircuitState = CircuitState.CLOSED
  private metrics: CircuitMetrics = {
    requests: 0,
    failures: 0,
    successes: 0,
    lastFailureTime: 0,
    lastSuccessTime: 0
  }
  private nextAttempt: number = 0
  
  constructor(private config: CircuitBreakerConfig) {
    this.logStateChange(CircuitState.CLOSED, 'Circuit breaker initialized')
  }

  async execute<R>(operation: () => Promise<R>, fallback?: () => Promise<R>): Promise<R> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        this.logCircuitOpen()
        if (fallback) {
          AppLogger.info('Circuit breaker executing fallback', {
            service: 'circuit-breaker',
            operation: 'fallback_execution',
            circuitName: this.config.name
          })
          return await fallback()
        }
        throw new Error(`Circuit breaker is OPEN for ${this.config.name}`)
      } else {
        this.state = CircuitState.HALF_OPEN
        this.logStateChange(CircuitState.HALF_OPEN, 'Testing service recovery')
      }
    }

    return this.attemptOperation(operation, fallback)
  }

  private async attemptOperation<R>(
    operation: () => Promise<R>, 
    fallback?: () => Promise<R>
  ): Promise<R> {
    this.metrics.requests++
    
    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure(error as Error)
      
      if (fallback && this.state === CircuitState.OPEN) {
        AppLogger.info('Circuit breaker executing fallback after failure', {
          service: 'circuit-breaker',
          operation: 'fallback_after_failure',
          circuitName: this.config.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        return await fallback()
      }
      
      throw error
    }
  }

  private onSuccess(): void {
    this.metrics.successes++
    this.metrics.lastSuccessTime = Date.now()

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED
      this.resetMetrics()
      this.logStateChange(CircuitState.CLOSED, 'Service recovered, circuit closed')
    }

    AppLogger.debug('Circuit breaker success recorded', {
      service: 'circuit-breaker',
      operation: 'success',
      circuitName: this.config.name,
      state: this.state,
      metrics: this.getMetrics()
    })
  }

  private onFailure(error: Error): void {
    this.metrics.failures++
    this.metrics.lastFailureTime = Date.now()

    AppLogger.warn('Circuit breaker failure recorded', {
      service: 'circuit-breaker',
      operation: 'failure',
      circuitName: this.config.name,
      error: error.message,
      state: this.state,
      metrics: this.getMetrics()
    })

    if (this.state === CircuitState.HALF_OPEN) {
      this.openCircuit('Half-open test failed')
      return
    }

    if (this.shouldOpenCircuit()) {
      this.openCircuit('Failure threshold exceeded')
    }
  }

  private shouldOpenCircuit(): boolean {
    if (this.metrics.requests < this.config.minimumThroughput) {
      return false
    }

    const failureRate = this.metrics.failures / this.metrics.requests
    return failureRate >= this.config.failureThreshold
  }

  private openCircuit(reason: string): void {
    this.state = CircuitState.OPEN
    this.nextAttempt = Date.now() + this.config.resetTimeout
    this.logStateChange(CircuitState.OPEN, reason)

    AppLogger.business('Circuit breaker opened', {
      service: 'circuit-breaker',
      operation: 'circuit_opened',
      businessEvent: 'system_reliability',
      circuitName: this.config.name,
      reason,
      nextAttempt: new Date(this.nextAttempt).toISOString(),
      metrics: this.getMetrics()
    })
  }

  private logCircuitOpen(): void {
    AppLogger.warn('Circuit breaker blocked request', {
      service: 'circuit-breaker',
      operation: 'request_blocked',
      circuitName: this.config.name,
      state: this.state,
      nextAttempt: new Date(this.nextAttempt).toISOString()
    })
  }

  private logStateChange(newState: CircuitState, reason: string): void {
    AppLogger.info('Circuit breaker state change', {
      service: 'circuit-breaker',
      operation: 'state_change',
      circuitName: this.config.name,
      previousState: this.state,
      newState,
      reason,
      timestamp: new Date().toISOString()
    })
  }

  private resetMetrics(): void {
    this.metrics = {
      requests: 0,
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0
    }
  }

  // Public methods for monitoring
  public getState(): CircuitState {
    return this.state
  }

  public getMetrics(): CircuitMetrics & { failureRate: number } {
    const failureRate = this.metrics.requests > 0 
      ? this.metrics.failures / this.metrics.requests 
      : 0

    return {
      ...this.metrics,
      failureRate: parseFloat(failureRate.toFixed(4))
    }
  }

  public getConfig(): CircuitBreakerConfig {
    return { ...this.config }
  }

  public reset(): void {
    this.state = CircuitState.CLOSED
    this.resetMetrics()
    this.nextAttempt = 0
    this.logStateChange(CircuitState.CLOSED, 'Manual reset')
  }

  // Health check method
  public isHealthy(): boolean {
    if (this.state === CircuitState.OPEN) {
      return false
    }

    if (this.metrics.requests < this.config.minimumThroughput) {
      return true // Not enough data to determine health
    }

    const failureRate = this.metrics.failures / this.metrics.requests
    return failureRate < this.config.failureThreshold * 0.8 // 80% of threshold
  }
}