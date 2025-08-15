import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SessionValidator } from '@/lib/auth/session-validator'
import { CorrelationMiddleware } from '@/lib/middleware/correlation'
import { AppLogger } from '@/lib/observability/logger'

export async function middleware(request: NextRequest) {
  // Wrap entire middleware in correlation context
  return await CorrelationMiddleware.process(request, async (req) => {
    const { pathname } = req.nextUrl
    
    // Protected routes
    const protectedRoutes = ['/dashboard', '/settings']
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    
    // Auth routes
    const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password']
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
    
    // Validate session using NextAuth's proper token validation
    const hasSession = await SessionValidator.validateRequest(req)
    
    const correlationId = req.headers.get('x-correlation-id') || 'unknown'
    
    // Update correlation context with user info if authenticated
    if (hasSession) {
      const userId = await SessionValidator.getUserId(req)
      if (userId) {
        CorrelationMiddleware.updateUserContext(correlationId, userId)
      }
    }

    // Log authentication events
    AppLogger.auth('Route access attempt', {
      service: 'middleware',
      operation: 'route_access',
      authEvent: hasSession ? 'authenticated_access' : 'unauthenticated_access',
      success: true,
      correlationId,
      metadata: {
        pathname,
        isProtectedRoute,
        isAuthRoute,
        hasSession
      }
    })
    
    // Redirect logic with logging
    if (isProtectedRoute && !hasSession) {
      AppLogger.auth('Redirecting unauthenticated user', {
        service: 'middleware',
        operation: 'auth_redirect',
        authEvent: 'failed_login',
        success: false,
        metadata: { from: pathname, to: '/login' }
      })
      return NextResponse.redirect(new URL('/login', req.url))
    }
    
    if (isAuthRoute && hasSession) {
      AppLogger.auth('Redirecting authenticated user from auth page', {
        service: 'middleware',
        operation: 'auth_redirect',
        authEvent: 'authenticated_access',
        success: true,
        metadata: { from: pathname, to: '/dashboard' }
      })
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    
    // Redirect root to dashboard if authenticated, otherwise to login
    if (pathname === '/') {
      const destination = hasSession ? '/dashboard' : '/login'
      AppLogger.info('Root redirect', {
        service: 'middleware',
        operation: 'root_redirect',
        metadata: { hasSession, destination }
      })
      return NextResponse.redirect(new URL(destination, req.url))
    }
    
    return NextResponse.next()
  })
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|verify-email).*)'],
}