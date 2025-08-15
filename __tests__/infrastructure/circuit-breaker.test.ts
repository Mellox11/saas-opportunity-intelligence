import { CircuitBreaker, CircuitState, CircuitBreakerConfig } from '@/lib/infrastructure/circuit-breaker'

// Mock AppLogger
jest.mock('@/lib/observability/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    business: jest.fn()
  }
}))

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker<string>
  const mockConfig: CircuitBreakerConfig = {
    name: 'test-service',
    failureThreshold: 0.5, // 50% failure rate
    resetTimeout: 1000, // 1 second for testing
    monitoringPeriod: 60000,
    minimumThroughput: 3
  }

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(mockConfig)
    jest.clearAllMocks()
  })

  describe('Circuit States', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED)
      expect(circuitBreaker.isHealthy()).toBe(true)
    })

    it('should open circuit after failure threshold exceeded', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service failure'))

      // Execute enough requests to meet minimum throughput
      for (let i = 0; i < 4; i++) {
        try {
          await circuitBreaker.execute(failingOperation)
        } catch (error) {
          // Expected failures
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN)
      expect(circuitBreaker.isHealthy()).toBe(false)
    })

    it('should not open circuit with low throughput', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service failure'))

      // Execute fewer requests than minimum throughput
      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreaker.execute(failingOperation)
        } catch (error) {
          // Expected failures
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED)
    })

    it('should transition to HALF_OPEN after reset timeout', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service failure'))
      const workingOperation = jest.fn().mockResolvedValue('success')

      // Trigger circuit to open
      for (let i = 0; i < 4; i++) {
        try {
          await circuitBreaker.execute(failingOperation)
        } catch (error) {
          // Expected failures
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN)

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Next request should transition to HALF_OPEN and then succeed
      const result = await circuitBreaker.execute(workingOperation)
      expect(result).toBe('success')
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED)
    })

    it('should return to OPEN if HALF_OPEN test fails', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service failure'))

      // Open the circuit
      for (let i = 0; i < 4; i++) {
        try {
          await circuitBreaker.execute(failingOperation)
        } catch (error) {
          // Expected failures
        }
      }

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Next request should fail and return to OPEN
      try {
        await circuitBreaker.execute(failingOperation)
      } catch (error) {
        // Expected failure
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN)
    })
  })

  describe('Fallback Mechanism', () => {
    it('should execute fallback when circuit is open', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service failure'))
      const fallbackOperation = jest.fn().mockResolvedValue('fallback result')

      // Open the circuit
      for (let i = 0; i < 4; i++) {
        try {
          await circuitBreaker.execute(failingOperation)
        } catch (error) {
          // Expected failures
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN)

      // Execute with fallback
      const result = await circuitBreaker.execute(failingOperation, fallbackOperation)
      expect(result).toBe('fallback result')
      expect(fallbackOperation).toHaveBeenCalled()
    })

    it('should throw error when circuit is open and no fallback provided', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service failure'))

      // Open the circuit
      for (let i = 0; i < 4; i++) {
        try {
          await circuitBreaker.execute(failingOperation)
        } catch (error) {
          // Expected failures
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN)

      // Execute without fallback should throw
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow(
        'Circuit breaker is OPEN for test-service'
      )
    })

    it('should execute fallback on failure when circuit is open', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service failure'))
      const fallbackOperation = jest.fn().mockResolvedValue('fallback result')

      // Open the circuit
      for (let i = 0; i < 4; i++) {
        try {
          await circuitBreaker.execute(failingOperation, fallbackOperation)
        } catch (error) {
          // Should not reach here as fallback should handle
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN)

      // Verify fallback was called for the last attempts
      expect(fallbackOperation).toHaveBeenCalled()
    })
  })

  describe('Metrics Tracking', () => {
    it('should track request and failure metrics', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service failure'))
      const successOperation = jest.fn().mockResolvedValue('success')

      // Execute some successful and failed operations
      await circuitBreaker.execute(successOperation)
      await circuitBreaker.execute(successOperation)

      try {
        await circuitBreaker.execute(failingOperation)
      } catch (error) {
        // Expected failure
      }

      const metrics = circuitBreaker.getMetrics()
      expect(metrics.requests).toBe(3)
      expect(metrics.successes).toBe(2)
      expect(metrics.failures).toBe(1)
      expect(metrics.failureRate).toBe(0.3333) // 1/3
    })

    it('should reset metrics when circuit closes after half-open success', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service failure'))
      const successOperation = jest.fn().mockResolvedValue('success')

      // Open the circuit
      for (let i = 0; i < 4; i++) {
        try {
          await circuitBreaker.execute(failingOperation)
        } catch (error) {
          // Expected failures
        }
      }

      // Wait and succeed to close circuit
      await new Promise(resolve => setTimeout(resolve, 1100))
      await circuitBreaker.execute(successOperation)

      const metrics = circuitBreaker.getMetrics()
      expect(metrics.requests).toBe(0) // Should be reset
      expect(metrics.failures).toBe(0)
      expect(metrics.successes).toBe(0)
    })
  })

  describe('Configuration and Control', () => {
    it('should return configuration', () => {
      const config = circuitBreaker.getConfig()
      expect(config).toEqual(mockConfig)
    })

    it('should allow manual reset', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service failure'))

      // Open the circuit
      for (let i = 0; i < 4; i++) {
        try {
          await circuitBreaker.execute(failingOperation)
        } catch (error) {
          // Expected failures
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN)

      // Manual reset
      circuitBreaker.reset()

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED)
      expect(circuitBreaker.getMetrics().requests).toBe(0)
    })

    it('should report health status correctly', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service failure'))
      const successOperation = jest.fn().mockResolvedValue('success')

      // Circuit should be healthy initially
      expect(circuitBreaker.isHealthy()).toBe(true)

      // Execute some mixed operations
      await circuitBreaker.execute(successOperation)
      await circuitBreaker.execute(successOperation)
      await circuitBreaker.execute(successOperation)

      try {
        await circuitBreaker.execute(failingOperation)
      } catch (error) {
        // Expected failure
      }

      // Should still be healthy (25% failure rate < 40% of 50% threshold)
      expect(circuitBreaker.isHealthy()).toBe(true)

      // Add more failures to make it unhealthy
      try {
        await circuitBreaker.execute(failingOperation)
        await circuitBreaker.execute(failingOperation)
      } catch (error) {
        // Expected failures
      }

      // Should now be unhealthy (50% failure rate >= 40% of 50% threshold)
      expect(circuitBreaker.isHealthy()).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid successive failures', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service failure'))

      // Execute many failures rapidly
      const promises = Array.from({ length: 10 }, () => 
        circuitBreaker.execute(failingOperation).catch(() => {})
      )

      await Promise.all(promises)

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN)
      expect(circuitBreaker.getMetrics().failures).toBeGreaterThanOrEqual(4)
    })

    it('should handle operations that throw non-Error objects', async () => {
      const operation = jest.fn().mockRejectedValue('string error')

      try {
        await circuitBreaker.execute(operation)
      } catch (error) {
        expect(error).toBe('string error')
      }

      const metrics = circuitBreaker.getMetrics()
      expect(metrics.failures).toBe(1)
    })

    it('should handle concurrent operations correctly', async () => {
      const slowOperation = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return 'success'
      })

      // Execute multiple concurrent operations
      const promises = Array.from({ length: 5 }, () => 
        circuitBreaker.execute(slowOperation)
      )

      const results = await Promise.all(promises)

      expect(results).toEqual(['success', 'success', 'success', 'success', 'success'])
      expect(circuitBreaker.getMetrics().requests).toBe(5)
      expect(circuitBreaker.getMetrics().successes).toBe(5)
    })
  })
})