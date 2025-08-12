import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AuthService } from '@/lib/auth/jwt'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const sessionToken = cookieStore.get('session-token')
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      )
    }
    
    // Find session
    const session = await prisma.session.findUnique({
      where: { sessionToken: sessionToken.value },
      include: { user: true }
    })
    
    if (!session || session.expires < new Date()) {
      // Session expired or not found
      cookieStore.delete('session-token')
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      )
    }
    
    // Extend session
    await prisma.session.update({
      where: { id: session.id },
      data: {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    })
    
    // Generate new JWT token
    const token = AuthService.generateTokens(session.user.id, session.user.email)
    
    // Update cookie
    cookieStore.set('session-token', sessionToken.value, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    })
    
    return NextResponse.json(
      {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: (session.user.profile as any)?.name || session.user.email
        },
        token
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh session' },
      { status: 500 }
    )
  }
}