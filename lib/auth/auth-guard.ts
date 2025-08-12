import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export function withAuth(handler: Function) {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      // Get session token from cookies
      const sessionToken = req.cookies.get('session-token')
      
      if (!sessionToken) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
      
      // Verify session
      const session = await prisma.session.findUnique({
        where: { sessionToken: sessionToken.value },
        include: { user: true }
      })
      
      if (!session || session.expires < new Date()) {
        return NextResponse.json(
          { error: 'Session expired' },
          { status: 401 }
        )
      }
      
      // Add user to request context
      ;(req as any).user = session.user
      
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