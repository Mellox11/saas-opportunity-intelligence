import { prisma } from '@/lib/db'
import { AppLogger } from '@/lib/observability/logger'
import { NextResponse } from 'next/server'

export interface LogoutOptions {
  userId?: string
  sessionToken?: string
  clearAllUserSessions?: boolean
  correlationId?: string
}

export interface LogoutResult {
  success: boolean
  sessionsCleared: number
  error?: string
}

/**
 * Comprehensive logout service that handles all aspects of user logout
 * including database cleanup, cookie management, and security logging
 */
export class LogoutService {
  /**
   * Perform complete logout cleanup
   */
  static async logout(options: LogoutOptions): Promise<LogoutResult> {
    const { userId, sessionToken, clearAllUserSessions = false, correlationId } = options
    
    try {
      AppLogger.auth('Starting logout process', {
        service: 'LogoutService',
        operation: 'logout',
        authEvent: 'logout_initiated',
        correlationId,
        metadata: { 
          hasUserId: !!userId, 
          hasSessionToken: !!sessionToken,
          clearAllUserSessions 
        }
      })

      let sessionsDeleted = 0

      if (sessionToken) {
        // Delete specific session
        const deletedSessions = await prisma.session.deleteMany({
          where: { sessionToken }
        })
        sessionsDeleted += deletedSessions.count

        AppLogger.auth('Session deleted by token', {
          service: 'LogoutService',
          operation: 'delete_session',
          authEvent: 'session_deleted',
          correlationId,
          metadata: { sessionToken: sessionToken.substring(0, 10) + '...', count: deletedSessions.count }
        })
      }

      if (userId && clearAllUserSessions) {
        // Delete all user sessions for security
        const deletedSessions = await prisma.session.deleteMany({
          where: { userId }
        })
        sessionsDeleted += deletedSessions.count

        AppLogger.auth('All user sessions deleted', {
          service: 'LogoutService',
          operation: 'delete_all_sessions',
          authEvent: 'all_sessions_deleted',
          correlationId,
          metadata: { userId, count: deletedSessions.count }
        })
      }

      AppLogger.auth('Logout completed successfully', {
        service: 'LogoutService',
        operation: 'logout',
        authEvent: 'logout_success',
        success: true,
        correlationId,
        metadata: { sessionsCleared: sessionsDeleted }
      })

      return {
        success: true,
        sessionsCleared: sessionsDeleted
      }
    } catch (error) {
      AppLogger.auth('Logout failed', {
        service: 'LogoutService',
        operation: 'logout',
        authEvent: 'logout_failed',
        success: false,
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: { userId, hasSessionToken: !!sessionToken }
      })

      return {
        success: false,
        sessionsCleared: 0,
        error: error instanceof Error ? error.message : 'Unknown logout error'
      }
    }
  }

  /**
   * Create a NextResponse with proper cookie clearing headers
   */
  static createLogoutResponse(message: string, status: number = 200): NextResponse {
    const response = NextResponse.json({ message }, { status })

    // Clear all authentication cookies with proper headers
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: new Date(0) // Set to epoch to force deletion
    }

    // Clear session-token cookie
    response.cookies.set('session-token', '', cookieOptions)
    
    // Clear auth-token cookie (if exists)
    response.cookies.set('auth-token', '', cookieOptions)

    // Add explicit Set-Cookie headers for broader compatibility
    const expiredCookieString = `; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`
    
    response.headers.append('Set-Cookie', `session-token=${expiredCookieString}`)
    response.headers.append('Set-Cookie', `auth-token=${expiredCookieString}`)

    return response
  }

  /**
   * Validate logout request and extract session information
   */
  static async validateLogoutRequest(request: Request): Promise<{
    sessionToken?: string
    userId?: string
    correlationId?: string
  }> {
    try {
      // Try to get session token from cookie
      const cookieHeader = request.headers.get('cookie')
      let sessionToken: string | undefined
      
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          acc[key] = value
          return acc
        }, {} as Record<string, string>)
        
        sessionToken = cookies['session-token'] || cookies['auth-token']
      }

      // Get correlation ID for logging
      const correlationId = request.headers.get('x-correlation-id') || undefined

      // If we have a session token, try to get user ID
      let userId: string | undefined
      if (sessionToken) {
        try {
          const session = await prisma.session.findUnique({
            where: { sessionToken },
            select: { userId: true }
          })
          userId = session?.userId
        } catch (error) {
          // Session lookup failed, but we can still proceed with logout
          AppLogger.warn('Session lookup failed during logout validation', {
            service: 'LogoutService',
            operation: 'validate_logout',
            correlationId,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return {
        sessionToken,
        userId,
        correlationId
      }
    } catch (error) {
      AppLogger.error('Logout request validation failed', {
        service: 'LogoutService',
        operation: 'validate_logout',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      return {}
    }
  }
}