import { NextRequest, NextResponse } from 'next/server'
import { circuitBreakerRegistry } from '@/lib/infrastructure/circuit-breaker-registry'
import { AppLogger } from '@/lib/observability/logger'

export async function GET(request: NextRequest) {
  try {
    const healthStatus = circuitBreakerRegistry.getHealthStatus()
    
    // Calculate overall system health
    const totalBreakers = Object.keys(healthStatus).length
    const healthyBreakers = Object.values(healthStatus).filter(status => status.isHealthy).length
    const openBreakers = Object.values(healthStatus).filter(status => status.state === 'OPEN').length
    
    const overallHealth = {
      status: openBreakers === 0 ? 'healthy' : openBreakers < totalBreakers ? 'degraded' : 'unhealthy',
      timestamp: new Date().toISOString(),
      summary: {
        total: totalBreakers,
        healthy: healthyBreakers,
        open: openBreakers,
        healthPercentage: Math.round((healthyBreakers / totalBreakers) * 100)
      }
    }

    AppLogger.info('Circuit breaker health check requested', {
      service: 'circuit-breaker-health',
      operation: 'health_check',
      metadata: {
        overallHealth: overallHealth.status,
        healthPercentage: overallHealth.summary.healthPercentage
      }
    })

    return NextResponse.json({
      overall: overallHealth,
      breakers: healthStatus
    }, {
      status: overallHealth.status === 'healthy' ? 200 : 
              overallHealth.status === 'degraded' ? 206 : 503
    })

  } catch (error) {
    AppLogger.error('Circuit breaker health check failed', {
      service: 'circuit-breaker-health',
      operation: 'health_check_error',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return NextResponse.json({
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, breaker } = body

    if (action === 'reset') {
      if (breaker === 'all') {
        circuitBreakerRegistry.resetAllBreakers()
        
        AppLogger.business('All circuit breakers reset via API', {
          service: 'circuit-breaker-admin',
          operation: 'reset_all_breakers',
          businessEvent: 'system_administration'
        })

        return NextResponse.json({
          message: 'All circuit breakers reset successfully',
          timestamp: new Date().toISOString()
        })
      } else if (typeof breaker === 'string') {
        const success = circuitBreakerRegistry.resetBreaker(breaker)
        
        if (success) {
          AppLogger.business('Circuit breaker reset via API', {
            service: 'circuit-breaker-admin',
            operation: 'reset_breaker',
            businessEvent: 'system_administration',
            metadata: {
              breakerName: breaker
            }
          })

          return NextResponse.json({
            message: `Circuit breaker '${breaker}' reset successfully`,
            timestamp: new Date().toISOString()
          })
        } else {
          return NextResponse.json({
            error: `Circuit breaker '${breaker}' not found`,
            timestamp: new Date().toISOString()
          }, { status: 404 })
        }
      }
    }

    return NextResponse.json({
      error: 'Invalid action or parameters',
      validActions: ['reset'],
      validTargets: ['all', 'specific breaker name'],
      timestamp: new Date().toISOString()
    }, { status: 400 })

  } catch (error) {
    AppLogger.error('Circuit breaker admin action failed', {
      service: 'circuit-breaker-admin',
      operation: 'admin_action_error',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return NextResponse.json({
      error: 'Admin action failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}