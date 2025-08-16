import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth/jwt'

export function withAuth(handler: Function) {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      // Get JWT token from cookies
      const authToken = req.cookies.get('auth-token')
      
      if (!authToken) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
      
      // Verify JWT token
      const user = AuthService.verifyToken(authToken.value)
      
      if (!user) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        )
      }
      
      // Add user to request context (map JWT payload to expected format)
      ;(req as any).user = {
        id: user.userId,
        email: user.email
      }
      
      return handler(req, ...args)
    } catch (error) {
      console.error('Auth guard error:', error)
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      )
    }
  }
}

export function requireAuth() {
  return withAuth
}