import { AppLogger, LogLevel } from '@/lib/observability/logger'

// Mock console methods
const mockConsoleLog = jest.fn()
const mockConsoleError = jest.fn()

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(mockConsoleLog)
  jest.spyOn(console, 'error').mockImplementation(mockConsoleError)
})

afterEach(() => {
  mockConsoleLog.mockClear()
  mockConsoleError.mockClear()
})

afterAll(() => {
  jest.restoreAllMocks()
})

describe('AppLogger', () => {
  const testContext = {
    service: 'test-service',
    operation: 'test-operation',
    correlationId: 'test-correlation-id',
    userId: 'test-user-id'
  }

  describe('info logging', () => {
    it('should log info messages with context', () => {
      AppLogger.info('Test info message', testContext)

      expect(mockConsoleLog).toHaveBeenCalled()
      const logCall = mockConsoleLog.mock.calls[0]
      const logEntry = JSON.parse(logCall[0])
      
      expect(logEntry.level).toBe('INFO')
      expect(logEntry.message).toBe('Test info message')
      expect(logEntry.context.service).toBe('test-service')
      expect(logEntry.context.operation).toBe('test-operation')
      expect(logEntry.context.correlationId).toBe('test-correlation-id')
    })
  })

  describe('error logging', () => {
    it('should log errors with stack trace', () => {
      const testError = new Error('Test error message')
      AppLogger.error('Test error occurred', testContext, testError)

      expect(mockConsoleLog).toHaveBeenCalled()
      const logCall = mockConsoleLog.mock.calls[0]
      const logEntry = JSON.parse(logCall[0])
      
      expect(logEntry.level).toBe('ERROR')
      expect(logEntry.message).toBe('Test error occurred')
      expect(logEntry.context.service).toBe('test-service')
      expect(logEntry.context.operation).toBe('test-operation')
      expect(logEntry.error.name).toBe('Error')
      expect(logEntry.error.message).toBe('Test error message')
      expect(logEntry.error.stack).toBeDefined()
    })
  })

  describe('performance logging', () => {
    it('should log performance metrics', () => {
      AppLogger.performance('Test operation completed', testContext, 150)

      expect(mockConsoleLog).toHaveBeenCalled()
      const logCall = mockConsoleLog.mock.calls[0]
      const logEntry = JSON.parse(logCall[0])
      
      expect(logEntry.level).toBe('INFO')
      expect(logEntry.message).toBe('Test operation completed')
      expect(logEntry.context.duration).toBe(150)
      expect(logEntry.performance.duration).toBe(150)
      expect(logEntry.performance.memoryUsage).toBeDefined()
    })
  })

  describe('authentication logging', () => {
    it('should log successful authentication events', () => {
      AppLogger.auth('User logged in', {
        ...testContext,
        authEvent: 'login',
        success: true
      })

      expect(mockConsoleLog).toHaveBeenCalled()
      const logCall = mockConsoleLog.mock.calls[0]
      const logEntry = JSON.parse(logCall[0])
      
      expect(logEntry.level).toBe('INFO')
      expect(logEntry.message).toBe('User logged in')
      expect(logEntry.context.metadata.authEvent).toBe('login')
      expect(logEntry.context.metadata.success).toBe(true)
    })

    it('should log failed authentication events as warnings', () => {
      AppLogger.auth('Login failed', {
        ...testContext,
        authEvent: 'failed_login',
        success: false
      })

      expect(mockConsoleLog).toHaveBeenCalled()
      const logCall = mockConsoleLog.mock.calls[0]
      const logEntry = JSON.parse(logCall[0])
      
      expect(logEntry.level).toBe('WARN')
      expect(logEntry.message).toBe('Login failed')
      expect(logEntry.context.metadata.authEvent).toBe('failed_login')
      expect(logEntry.context.metadata.success).toBe(false)
    })
  })

  describe('business event logging', () => {
    it('should log business events with value', () => {
      AppLogger.business('Analysis started', {
        ...testContext,
        businessEvent: 'analysis_started',
        value: 25.00,
        currency: 'USD'
      })

      expect(mockConsoleLog).toHaveBeenCalled()
      const logCall = mockConsoleLog.mock.calls[0]
      const logEntry = JSON.parse(logCall[0])
      
      expect(logEntry.level).toBe('INFO')
      expect(logEntry.message).toBe('Analysis started')
      expect(logEntry.context.metadata.businessEvent).toBe('analysis_started')
      expect(logEntry.context.metadata.value).toBe(25.00)
      expect(logEntry.context.metadata.currency).toBe('USD')
    })
  })

  describe('child logger', () => {
    it('should create child logger with preset context', () => {
      const childLogger = AppLogger.createChild({
        service: 'child-service',
        operation: 'child-operation'
      })

      childLogger.info('Child logger message', {
        correlationId: 'child-correlation-id'
      })

      expect(mockConsoleLog).toHaveBeenCalled()
      const logCall = mockConsoleLog.mock.calls[0]
      const logEntry = JSON.parse(logCall[0])
      
      expect(logEntry.level).toBe('INFO')
      expect(logEntry.message).toBe('Child logger message')
      expect(logEntry.context.service).toBe('child-service')
      expect(logEntry.context.operation).toBe('child-operation')
      expect(logEntry.context.correlationId).toBe('child-correlation-id')
    })
  })

  describe('log level filtering', () => {
    beforeEach(() => {
      AppLogger.setLogLevel(LogLevel.WARN)
    })

    afterEach(() => {
      AppLogger.setLogLevel(LogLevel.DEBUG)
    })

    it('should filter out logs below set level', () => {
      AppLogger.debug('Debug message', testContext)
      AppLogger.info('Info message', testContext)
      AppLogger.warn('Warning message', testContext)

      // Only warning should be logged
      expect(mockConsoleLog).toHaveBeenCalledTimes(1)
      const logCall = mockConsoleLog.mock.calls[0]
      const logEntry = JSON.parse(logCall[0])
      expect(logEntry.level).toBe('WARN')
      expect(logEntry.message).toBe('Warning message')
    })
  })
})