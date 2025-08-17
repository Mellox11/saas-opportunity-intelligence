import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Protected routes
  const protectedRoutes = ['/dashboard', '/settings', '/analysis']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  // Auth routes
  const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email']
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  
  // Simple session check - just verify cookie exists
  // The actual JWT verification happens in API routes
  const sessionToken = request.cookies.get('session-token')?.value
  const authToken = request.cookies.get('auth-token')?.value
  const hasSession = !!(sessionToken || authToken)
  
  console.log(`[Middleware] Path: ${pathname}, HasSession: ${hasSession}, Protected: ${isProtectedRoute}`)
  
  // Redirect logic
  if (isProtectedRoute && !hasSession) {
    console.log(`[Middleware] Redirecting to login from ${pathname}`)
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  if (isAuthRoute && hasSession) {
    console.log(`[Middleware] Redirecting to dashboard from ${pathname}`)
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  // Redirect root to dashboard if authenticated, otherwise to login
  if (pathname === '/') {
    const destination = hasSession ? '/dashboard' : '/login'
    return NextResponse.redirect(new URL(destination, request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|test-auth).*)'],
}