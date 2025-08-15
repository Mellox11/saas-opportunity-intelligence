import { NextRequest, NextResponse } from 'next/server'
import { jobMonitoringService } from '@/lib/infrastructure/job-monitoring'
import { AppLogger } from '@/lib/observability/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const queueName = searchParams.get('queue')

    switch (action) {
      case 'status':
        const status = jobMonitoringService.getStatus()
        
        AppLogger.info('Job monitoring status requested', {
          service: 'job-monitoring-admin',
          operation: 'status_check',
          isRunning: status.isRunning
        })

        return NextResponse.json({
          ...status,
          timestamp: new Date().toISOString()
        })

      case 'metrics':
        const metrics = await jobMonitoringService.collectMetrics()
        
        AppLogger.info('Job monitoring metrics requested', {
          service: 'job-monitoring-admin',
          operation: 'metrics_requested',
          overallHealth: metrics.overallHealthStatus,
          totalJobs: metrics.totalJobs
        })

        return NextResponse.json({
          metrics,
          timestamp: new Date().toISOString()
        })

      case 'history':
        if (!queueName) {
          return NextResponse.json({
            error: 'Queue name is required for history action',
            timestamp: new Date().toISOString()
          }, { status: 400 })
        }

        const history = jobMonitoringService.getQueueHistory(queueName)
        
        return NextResponse.json({
          queueName,
          history,
          timestamp: new Date().toISOString()
        })

      case 'alerts':
        const alerts = jobMonitoringService.getAlerts()
        
        return NextResponse.json({
          alerts,
          alertCount: alerts.length,
          timestamp: new Date().toISOString()
        })

      default:
        // Return current metrics by default
        const currentMetrics = jobMonitoringService.getCurrentMetrics()
        
        return NextResponse.json({
          metrics: currentMetrics,
          timestamp: new Date().toISOString()
        })
    }

  } catch (error) {
    AppLogger.error('Job monitoring API request failed', {
      service: 'job-monitoring-admin',
      operation: 'api_request_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json({
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, config } = body

    switch (action) {
      case 'start':
        jobMonitoringService.start()
        
        AppLogger.business('Job monitoring service started via API', {
          service: 'job-monitoring-admin',
          operation: 'service_started',
          businessEvent: 'system_administration'
        })

        return NextResponse.json({
          message: 'Job monitoring service started',
          timestamp: new Date().toISOString()
        })

      case 'stop':
        jobMonitoringService.stop()
        
        AppLogger.business('Job monitoring service stopped via API', {
          service: 'job-monitoring-admin',
          operation: 'service_stopped',
          businessEvent: 'system_administration'
        })

        return NextResponse.json({
          message: 'Job monitoring service stopped',
          timestamp: new Date().toISOString()
        })

      case 'update-config':
        if (!config) {
          return NextResponse.json({
            error: 'Configuration is required for update-config action',
            timestamp: new Date().toISOString()
          }, { status: 400 })
        }

        jobMonitoringService.updateAlertConfig(config)
        
        AppLogger.business('Job monitoring config updated via API', {
          service: 'job-monitoring-admin',
          operation: 'config_updated',
          businessEvent: 'system_configuration',
          newConfig: config
        })

        return NextResponse.json({
          message: 'Alert configuration updated',
          newConfig: config,
          timestamp: new Date().toISOString()
        })

      case 'collect-metrics':
        const metrics = await jobMonitoringService.collectMetrics()
        
        AppLogger.info('Manual metrics collection via API', {
          service: 'job-monitoring-admin',
          operation: 'manual_metrics_collection'
        })

        return NextResponse.json({
          message: 'Metrics collected',
          metrics,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json({
          error: 'Invalid action',
          validActions: ['start', 'stop', 'update-config', 'collect-metrics'],
          timestamp: new Date().toISOString()
        }, { status: 400 })
    }

  } catch (error) {
    AppLogger.error('Job monitoring admin action failed', {
      service: 'job-monitoring-admin',
      operation: 'admin_action_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json({
      error: 'Admin action failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}