import { NextRequest, NextResponse } from 'next/server'
import { queueCleanupService } from '@/lib/infrastructure/queue-cleanup'
import { AppLogger } from '@/lib/observability/logger'

export async function GET(request: NextRequest) {
  try {
    const status = queueCleanupService.getStatus()
    
    AppLogger.info('Queue cleanup status requested', {
      service: 'queue-cleanup-admin',
      operation: 'status_check',
      metadata: {
        isRunning: status.isRunning
      }
    })

    return NextResponse.json({
      ...status,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    AppLogger.error('Queue cleanup status check failed', {
      service: 'queue-cleanup-admin',
      operation: 'status_check_error',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, error as Error)

    return NextResponse.json({
      error: 'Failed to get cleanup status',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'start':
        queueCleanupService.start()
        
        AppLogger.business('Queue cleanup service started via API', {
          service: 'queue-cleanup-admin',
          operation: 'service_started',
          businessEvent: 'system_administration'
        })

        return NextResponse.json({
          message: 'Queue cleanup service started',
          timestamp: new Date().toISOString()
        })

      case 'stop':
        queueCleanupService.stop()
        
        AppLogger.business('Queue cleanup service stopped via API', {
          service: 'queue-cleanup-admin',
          operation: 'service_stopped',
          businessEvent: 'system_administration'
        })

        return NextResponse.json({
          message: 'Queue cleanup service stopped',
          timestamp: new Date().toISOString()
        })

      case 'cleanup':
        const metrics = await queueCleanupService.performCleanup()
        
        AppLogger.business('Manual queue cleanup performed via API', {
          service: 'queue-cleanup-admin',
          operation: 'manual_cleanup',
          businessEvent: 'system_maintenance',
          metadata: {
            metrics
          }
        })

        return NextResponse.json({
          message: 'Manual cleanup completed',
          metrics,
          timestamp: new Date().toISOString()
        })

      case 'reset-metrics':
        queueCleanupService.resetMetrics()
        
        AppLogger.info('Queue cleanup metrics reset via API', {
          service: 'queue-cleanup-admin',
          operation: 'metrics_reset'
        })

        return NextResponse.json({
          message: 'Metrics reset successfully',
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json({
          error: 'Invalid action',
          validActions: ['start', 'stop', 'cleanup', 'reset-metrics'],
          timestamp: new Date().toISOString()
        }, { status: 400 })
    }

  } catch (error) {
    AppLogger.error('Queue cleanup admin action failed', {
      service: 'queue-cleanup-admin',
      operation: 'admin_action_error',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, error as Error)

    return NextResponse.json({
      error: 'Admin action failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}