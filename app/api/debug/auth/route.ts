import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AuthService } from '@/lib/auth/jwt'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const sessionToken = cookieStore.get('session-token')?.value
    const authToken = cookieStore.get('auth-token')?.value
    const authHeader = request.headers.get('authorization')
    
    // Get JWT_SECRET safely
    const jwtSecret = process.env.JWT_SECRET
    const nextAuthSecret = process.env.NEXTAUTH_SECRET
    const nextAuthUrl = process.env.NEXTAUTH_URL
    const nodeEnv = process.env.NODE_ENV
    
    const debugInfo = {
      environment: nodeEnv,
      nextAuthUrl: nextAuthUrl,
      cookies: {
        'session-token': sessionToken ? `Present (${sessionToken.length} chars)` : 'Missing',
        'auth-token': authToken ? `Present (${authToken.length} chars)` : 'Missing',
      },
      headers: {
        authorization: authHeader ? 'Present' : 'Missing',
      },
      secrets: {
        JWT_SECRET: jwtSecret ? `Set (${jwtSecret.length} chars)` : 'MISSING!',
        NEXTAUTH_SECRET: nextAuthSecret ? `Set (${nextAuthSecret.length} chars)` : 'MISSING!',
      },
      verification: {
        sessionToken: null as any,
        authToken: null as any,
        authHeader: null as any,
      }
    }
    
    // Try to verify tokens
    if (sessionToken) {
      try {
        const decoded = AuthService.verifyToken(sessionToken)
        debugInfo.verification.sessionToken = decoded ? 'Valid' : 'Invalid'
      } catch (e) {
        debugInfo.verification.sessionToken = `Error: ${e instanceof Error ? e.message : 'Unknown'}`
      }
    }
    
    if (authToken) {
      try {
        const decoded = AuthService.verifyToken(authToken)
        debugInfo.verification.authToken = decoded ? 'Valid' : 'Invalid'
      } catch (e) {
        debugInfo.verification.authToken = `Error: ${e instanceof Error ? e.message : 'Unknown'}`
      }
    }
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const decoded = AuthService.verifyToken(token)
        debugInfo.verification.authHeader = decoded ? 'Valid' : 'Invalid'
      } catch (e) {
        debugInfo.verification.authHeader = `Error: ${e instanceof Error ? e.message : 'Unknown'}`
      }
    }
    
    return NextResponse.json(debugInfo, { status: 200 })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Debug endpoint error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}