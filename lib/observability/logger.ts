import { EnvironmentConfig } from '@/lib/config/environment'
import { AlertingService, AlertSeverity } from './alerting'

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

/**
 * Standardized log context for correlation and debugging
 */
export interface LogContext {
  correlationId?: string
  userId?: string
  analysisId?: string
  sessionId?: string
  requestId?: string
  service: string
  operation: string
  duration?: number
  httpMethod?: string
  httpStatus?: number
  userAgent?: string
  ip?: string
  metadata?: Record<string, any>
}

/**
 * Structured log entry format
 */
export interface LogEntry {
  timestamp: string
  level: string
  message: string
  context: LogContext
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
  performance?: {
    duration: number
    memoryUsage?: any
  }
}

/**
 * Application Logger with structured output
 * Provides correlation tracking, performance monitoring, and production-ready logging
 */
export class AppLogger {
  private static logLevel: LogLevel = EnvironmentConfig.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO
  private static serviceName: string = 'saas-opportunity-intelligence'

  /**
   * Set minimum log level
   */
  static setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  /**
   * Log error with full context and stack trace
   */
  static error(message: string, context: LogContext, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error)
    
    // Send alert for errors with specific tags in production
    if (EnvironmentConfig.isProduction && context.metadata?.alertOnError) {
      AlertingService.sendAlert({
        severity: AlertSeverity.ERROR,
        title: 'Error Alert',
        message,
        service: context.service,
        metadata: context.metadata,
        error,
        timestamp: new Date()
      }).catch(alertError => {
        console.error('Failed to send error alert:', alertError)
      })
    }
  }

  /**
   * Log critical error (between error and fatal)
   */
  static critical(message: string, context: LogContext, error?: Error): void {
    this.log(LogLevel.CRITICAL, message, context, error)
    
    // Send alert for critical errors in production
    if (EnvironmentConfig.isProduction) {
      AlertingService.sendAlert({
        severity: AlertSeverity.CRITICAL,
        title: 'Critical Error',
        message,
        service: context.service,
        metadata: context.metadata,
        error,
        timestamp: new Date()
      }).catch(alertError => {
        console.error('Failed to send critical alert:', alertError)
      })
    }
  }

  /**
   * Log warning with context
   */
  static warn(message: string, context: LogContext): void {
    this.log(LogLevel.WARN, message, context)
  }

  /**
   * Log informational message
   */
  static info(message: string, context: LogContext): void {
    this.log(LogLevel.INFO, message, context)
  }

  /**
   * Log debug information (development only)
   */
  static debug(message: string, context: LogContext): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  /**
   * Log fatal error and prepare for shutdown
   */
  static fatal(message: string, context: LogContext, error?: Error): void {
    this.log(LogLevel.FATAL, message, context, error)
    
    // In production, fatal errors should trigger alerting
    if (EnvironmentConfig.isProduction) {
      // Integrate with alerting system
      AlertingService.sendAlert({
        severity: AlertSeverity.CRITICAL,
        title: 'Fatal Error Occurred',
        message,
        service: context.service,
        metadata: context.metadata,
        error,
        timestamp: new Date()
      }).catch(alertError => {
        console.error('Failed to send fatal alert:', alertError)
      })
      
      console.error('🚨 FATAL ERROR - IMMEDIATE ATTENTION REQUIRED')
    }
  }

  /**
   * Log performance metrics
   */
  static performance(
    message: string, 
    context: LogContext, 
    duration: number, 
    memoryUsage?: any
  ): void {
    const performanceContext = {
      ...context,
      duration,
      metadata: {
        ...context.metadata,
        performance: {
          duration,
          memoryUsage
        }
      }
    }

    this.log(LogLevel.INFO, message, performanceContext)
  }

  /**
   * Log HTTP request/response
   */
  static http(
    message: string,
    context: LogContext & {
      httpMethod: string
      httpStatus: number
      duration: number
    }
  ): void {
    const level = context.httpStatus >= 500 ? LogLevel.ERROR :
                 context.httpStatus >= 400 ? LogLevel.WARN :
                 LogLevel.INFO

    this.log(level, message, context)
  }

  /**
   * Log authentication events
   */
  static auth(
    message: string,
    context: LogContext & {
      authEvent: 'login' | 'logout' | 'register' | 'failed_login' | 'token_refresh' | 'authenticated_access' | 'unauthenticated_access'
      success: boolean
    }
  ): void {
    const level = context.success ? LogLevel.INFO : LogLevel.WARN
    
    // Never log sensitive data
    const sanitizedContext = {
      ...context,
      metadata: {
        ...context.metadata,
        authEvent: context.authEvent,
        success: context.success
      }
    }

    this.log(level, message, sanitizedContext)
  }

  /**
   * Log business events (analysis, payments, etc.)
   */
  static business(
    message: string,
    context: LogContext & {
      businessEvent: string
      value?: number
      currency?: string
    }
  ): void {
    const businessContext = {
      ...context,
      metadata: {
        ...context.metadata,
        businessEvent: context.businessEvent,
        value: context.value,
        currency: context.currency
      }
    }

    this.log(LogLevel.INFO, message, businessContext)
  }

  /**
   * Core logging method with structured output
   */
  private static log(level: LogLevel, message: string, context: LogContext, error?: Error): void {
    // Skip if below log level
    if (level < this.logLevel) return

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context: {
        ...context,
        service: context.service || this.serviceName
      }
    }

    // Add error details if provided
    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      }
    }

    // Add performance data if duration provided
    if (context.duration) {
      logEntry.performance = {
        duration: context.duration,
        // Skip memory usage in Edge Runtime
        memoryUsage: typeof process !== 'undefined' && process.memoryUsage ? process.memoryUsage() : undefined
      }
    }

    // Output format based on environment
    if (EnvironmentConfig.isDevelopment) {
      this.outputDevelopment(logEntry)
    } else {
      this.outputProduction(logEntry)
    }
  }

  /**
   * Development-friendly console output
   */
  private static outputDevelopment(entry: LogEntry): void {
    const emoji = this.getLogEmoji(entry.level)
    const timestamp = entry.timestamp.split('T')[1].split('.')[0]
    
    console.log(
      `${emoji} ${timestamp} [${entry.level}] ${entry.context.service}:${entry.context.operation}`
    )
    console.log(`  📝 ${entry.message}`)
    
    if (entry.context.correlationId) {
      console.log(`  🔗 ${entry.context.correlationId}`)
    }
    
    if (entry.context.userId) {
      console.log(`  👤 User: ${entry.context.userId}`)
    }
    
    if (entry.context.duration) {
      console.log(`  ⏱️  ${entry.context.duration}ms`)
    }
    
    if (entry.error) {
      console.error(`  ❌ ${entry.error.name}: ${entry.error.message}`)
      if (entry.error.stack) {
        console.error(`     ${entry.error.stack}`)
      }
    }
    
    console.log('') // Empty line for readability
  }

  /**
   * Production JSON output for log aggregation
   */
  private static outputProduction(entry: LogEntry): void {
    console.log(JSON.stringify(entry))
  }

  /**
   * Get emoji for log level (development)
   */
  private static getLogEmoji(level: string): string {
    switch (level) {
      case 'DEBUG': return '🐛'
      case 'INFO': return 'ℹ️'
      case 'WARN': return '⚠️'
      case 'ERROR': return '❌'
      case 'FATAL': return '💀'
      default: return '📝'
    }
  }

  /**
   * Create child logger with preset context
   */
  static createChild(baseContext: Partial<LogContext>): ChildLogger {
    return new ChildLogger(baseContext)
  }
}

/**
 * Child logger with preset context for specific operations
 */
export class ChildLogger {
  constructor(private baseContext: Partial<LogContext>) {}

  error(message: string, additionalContext?: Partial<LogContext>, error?: Error): void {
    AppLogger.error(message, { ...this.baseContext, ...additionalContext } as LogContext, error)
  }

  warn(message: string, additionalContext?: Partial<LogContext>): void {
    AppLogger.warn(message, { ...this.baseContext, ...additionalContext } as LogContext)
  }

  info(message: string, additionalContext?: Partial<LogContext>): void {
    AppLogger.info(message, { ...this.baseContext, ...additionalContext } as LogContext)
  }

  debug(message: string, additionalContext?: Partial<LogContext>): void {
    AppLogger.debug(message, { ...this.baseContext, ...additionalContext } as LogContext)
  }

  performance(message: string, duration: number, additionalContext?: Partial<LogContext>): void {
    AppLogger.performance(
      message, 
      { ...this.baseContext, ...additionalContext } as LogContext, 
      duration
    )
  }
}

/**
 * Performance measurement decorator
 */
export function withPerformanceLogging(
  operation: string,
  service: string,
  context?: Partial<LogContext>
) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!

    descriptor.value = (async function (this: any, ...args: any[]) {
      const start = performance.now()
      const logger = AppLogger.createChild({
        service,
        operation,
        ...context
      })

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