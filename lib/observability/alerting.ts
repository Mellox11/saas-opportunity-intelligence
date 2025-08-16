import { AppLogger } from './logger'
import { EnvironmentConfig } from '@/lib/config/environment'

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Alert configuration for different channels
 */
export interface AlertConfig {
  enabled: boolean
  webhookUrl?: string
  apiKey?: string
  channel?: string
  mentions?: string[]
}

/**
 * Alert message structure
 */
export interface AlertMessage {
  severity: AlertSeverity
  title: string
  message: string
  service?: string
  metadata?: Record<string, any>
  error?: Error
  timestamp: Date
}

/**
 * Alerting service for critical notifications
 * Supports multiple alert channels (Slack, Discord, PagerDuty, etc.)
 */
export class AlertingService {
  private static slackConfig: AlertConfig = {
    enabled: !!process.env.SLACK_WEBHOOK_URL,
    webhookUrl: process.env.SLACK_WEBHOOK_URL
  }
  
  private static discordConfig: AlertConfig = {
    enabled: !!process.env.DISCORD_WEBHOOK_URL,
    webhookUrl: process.env.DISCORD_WEBHOOK_URL
  }
  
  private static pagerDutyConfig: AlertConfig = {
    enabled: !!process.env.PAGERDUTY_INTEGRATION_KEY,
    apiKey: process.env.PAGERDUTY_INTEGRATION_KEY
  }
  
  /**
   * Send alert to all configured channels
   */
  static async sendAlert(alert: AlertMessage): Promise<void> {
    const promises: Promise<void>[] = []
    
    // Send to Slack if configured
    if (this.slackConfig.enabled) {
      promises.push(this.sendSlackAlert(alert))
    }
    
    // Send to Discord if configured
    if (this.discordConfig.enabled) {
      promises.push(this.sendDiscordAlert(alert))
    }
    
    // Send to PagerDuty for critical alerts
    if (this.pagerDutyConfig.enabled && alert.severity === AlertSeverity.CRITICAL) {
      promises.push(this.sendPagerDutyAlert(alert))
    }
    
    // Always log the alert
    this.logAlert(alert)
    
    // Wait for all alerts to be sent
    await Promise.allSettled(promises)
  }
  
  /**
   * Send alert to Slack
   */
  private static async sendSlackAlert(alert: AlertMessage): Promise<void> {
    if (!this.slackConfig.webhookUrl) return
    
    try {
      const color = this.getSlackColor(alert.severity)
      const payload = {
        text: `🚨 ${alert.title}`,
        attachments: [{
          color,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Service',
              value: alert.service || 'Unknown',
              short: true
            },
            {
              title: 'Message',
              value: alert.message,
              short: false
            },
            {
              title: 'Timestamp',
              value: alert.timestamp.toISOString(),
              short: true
            }
          ],
          footer: 'SaaS OI Alert System'
        }]
      }
      
      // Add error details if present
      if (alert.error) {
        payload.attachments[0].fields.push({
          title: 'Error Details',
          value: `\`\`\`${alert.error.stack || alert.error.message}\`\`\``,
          short: false
        })
      }
      
      // Add metadata if present
      if (alert.metadata && Object.keys(alert.metadata).length > 0) {
        payload.attachments[0].fields.push({
          title: 'Additional Context',
          value: JSON.stringify(alert.metadata, null, 2),
          short: false
        })
      }
      
      const response = await fetch(this.slackConfig.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.statusText}`)
      }
      
    } catch (error) {
      AppLogger.error('Failed to send Slack alert', {
        service: 'alerting',
        operation: 'slack_alert_failed',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }
  
  /**
   * Send alert to Discord
   */
  private static async sendDiscordAlert(alert: AlertMessage): Promise<void> {
    if (!this.discordConfig.webhookUrl) return
    
    try {
      const color = this.getDiscordColor(alert.severity)
      const payload = {
        embeds: [{
          title: `🚨 ${alert.title}`,
          description: alert.message,
          color,
          fields: [
            {
              name: 'Severity',
              value: alert.severity.toUpperCase(),
              inline: true
            },
            {
              name: 'Service',
              value: alert.service || 'Unknown',
              inline: true
            },
            {
              name: 'Timestamp',
              value: alert.timestamp.toISOString(),
              inline: false
            }
          ],
          footer: {
            text: 'SaaS OI Alert System'
          },
          timestamp: alert.timestamp.toISOString()
        }]
      }
      
      // Add error details if present
      if (alert.error) {
        payload.embeds[0].fields.push({
          name: 'Error Details',
          value: `\`\`\`${alert.error.message}\`\`\``,
          inline: false
        })
      }
      
      const response = await fetch(this.discordConfig.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        throw new Error(`Discord webhook failed: ${response.statusText}`)
      }
      
    } catch (error) {
      AppLogger.error('Failed to send Discord alert', {
        service: 'alerting',
        operation: 'discord_alert_failed',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }
  
  /**
   * Send alert to PagerDuty
   */
  private static async sendPagerDutyAlert(alert: AlertMessage): Promise<void> {
    if (!this.pagerDutyConfig.apiKey) return
    
    try {
      const payload = {
        routing_key: this.pagerDutyConfig.apiKey,
        event_action: 'trigger',
        dedup_key: `${alert.service}-${alert.severity}-${Date.now()}`,
        payload: {
          summary: alert.title,
          severity: this.getPagerDutySeverity(alert.severity),
          source: alert.service || 'saas-oi',
          custom_details: {
            message: alert.message,
            metadata: alert.metadata,
            error: alert.error?.message
          }
        }
      }
      
      const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        throw new Error(`PagerDuty API failed: ${response.statusText}`)
      }
      
    } catch (error) {
      AppLogger.error('Failed to send PagerDuty alert', {
        service: 'alerting',
        operation: 'pagerduty_alert_failed',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }
  
  /**
   * Log the alert locally
   */
  private static logAlert(alert: AlertMessage): void {
    const logMessage = `ALERT [${alert.severity.toUpperCase()}]: ${alert.title} - ${alert.message}`
    
    switch (alert.severity) {
      case AlertSeverity.INFO:
        AppLogger.info(logMessage, {
          service: 'alerting',
          operation: 'alert_logged',
          metadata: alert.metadata
        })
        break
      case AlertSeverity.WARNING:
        AppLogger.warn(logMessage, {
          service: 'alerting',
          operation: 'alert_logged',
          metadata: alert.metadata
        })
        break
      case AlertSeverity.ERROR:
        AppLogger.error(logMessage, {
          service: 'alerting',
          operation: 'alert_logged',
          metadata: alert.metadata
        }, alert.error)
        break
      case AlertSeverity.CRITICAL:
        AppLogger.critical(logMessage, {
          service: 'alerting',
          operation: 'alert_logged',
          metadata: alert.metadata
        }, alert.error)
        break
    }
  }
  
  /**
   * Get Slack color based on severity
   */
  private static getSlackColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.INFO: return '#36a64f'
      case AlertSeverity.WARNING: return '#ff9900'
      case AlertSeverity.ERROR: return '#ff0000'
      case AlertSeverity.CRITICAL: return '#990000'
    }
  }
  
  /**
   * Get Discord color based on severity
   */
  private static getDiscordColor(severity: AlertSeverity): number {
    switch (severity) {
      case AlertSeverity.INFO: return 0x36a64f
      case AlertSeverity.WARNING: return 0xff9900
      case AlertSeverity.ERROR: return 0xff0000
      case AlertSeverity.CRITICAL: return 0x990000
    }
  }
  
  /**
   * Map to PagerDuty severity
   */
  private static getPagerDutySeverity(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.INFO: return 'info'
      case AlertSeverity.WARNING: return 'warning'
      case AlertSeverity.ERROR: return 'error'
      case AlertSeverity.CRITICAL: return 'critical'
    }
  }
  
  /**
   * Send test alert to verify configuration
   */
  static async sendTestAlert(): Promise<void> {
    await this.sendAlert({
      severity: AlertSeverity.INFO,
      title: 'Test Alert',
      message: 'This is a test alert to verify alerting configuration',
      service: 'alerting-test',
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date()
    })
  }
}

/**
 * Helper function to send critical alerts
 */
export async function sendCriticalAlert(
  title: string,
  message: string,
  error?: Error,
  metadata?: Record<string, any>
): Promise<void> {
  await AlertingService.sendAlert({
    severity: AlertSeverity.CRITICAL,
    title,
    message,
    error,
    metadata,
    timestamp: new Date()
  })
}

/**
 * Helper function to send error alerts
 */
export async function sendErrorAlert(
  title: string,
  message: string,
  error?: Error,
  metadata?: Record<string, any>
): Promise<void> {
  await AlertingService.sendAlert({
    severity: AlertSeverity.ERROR,
    title,
    message,
    error,
    metadata,
    timestamp: new Date()
  })
}