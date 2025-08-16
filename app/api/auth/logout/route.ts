import { NextRequest } from 'next/server'
import { LogoutService } from '@/lib/auth/logout.service'
import { AppLogger } from '@/lib/observability/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Validate request and extract session information
    const { sessionToken, userId, correlationId } = await LogoutService.validateLogoutRequest(request)
    
    AppLogger.auth('Logout API called', {
      service: 'auth/logout',
      operation: 'logout_request',
      authEvent: 'logout',
      success: true,
      correlationId,
      metadata: { 
        hasSessionToken: !!sessionToken,
        hasUserId: !!userId,
        userAgent: request.headers.get('user-agent')?.substring(0, 100)
      }
    })

    // Perform logout with comprehensive cleanup
    const result = await LogoutService.logout({
      sessionToken,
      userId,
      clearAllUserSessions: false, // Only clear current session by default
      correlationId
    })

    if (result.success) {
      AppLogger.auth('Logout successful', {
        service: 'auth/logout',
        operation: 'logout_complete',
        authEvent: 'logout',
        success: true,
        correlationId,
        metadata: { sessionsCleared: result.sessionsCleared }
      })

      // Return response with proper cookie clearing
      return LogoutService.createLogoutResponse('Logged out successfully', 200)
    } else {
      AppLogger.auth('Logout failed', {
        service: 'auth/logout',
        operation: 'logout_complete',
        authEvent: 'logout',
        success: false,
        correlationId,
        metadata: {
          error: result.error
        }
      })

      // Still clear cookies even if database cleanup failed
      return LogoutService.createLogoutResponse('Logout completed with warnings', 200)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown logout error'
    
    AppLogger.auth('Logout API error', {
      service: 'auth/logout',
      operation: 'logout_request',
      authEvent: 'logout',
      success: false,
      metadata: {
        error: errorMessage
      }
    })

    // Even on error, try to clear cookies
    return LogoutService.createLogoutResponse('Logout failed', 500)
  }
}