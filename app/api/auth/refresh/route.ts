import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth/jwt'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      )
    }
    
    // Verify current token
    const user = AuthService.verifyToken(token)
    
    if (!user) {
      // Token invalid or expired - remove it
      const response = NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      )
      response.cookies.delete('auth-token')
      return response
    }
    
    // Generate new JWT token (refresh)
    const newToken = AuthService.generateTokens(user.userId, user.email)
    
    // Set new token in cookie
    const response = NextResponse.json(
      {
        user: {
          id: user.userId,
          email: user.email,
          name: user.email // Using email as name fallback
        },
        token: newToken
      },
      { status: 200 }
    )
    
    response.cookies.set('auth-token', newToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    })
    
    return response
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh session' },
      { status: 500 }
    )
  }
}