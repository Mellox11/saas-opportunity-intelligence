import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AuthService } from '@/lib/auth/jwt'
import { loginSchema } from '@/lib/validation/auth-schema'
import { authRateLimiter, withRateLimit } from '@/lib/security/rate-limiter'
import { cookies } from 'next/headers'

async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = loginSchema.parse(body)
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email before logging in' },
        { status: 401 }
      )
    }
    
    // Verify password
    const isValid = await AuthService.verifyPassword(validatedData.password, user.passwordHash)
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Generate JWT token
    const token = AuthService.generateTokens(user.id, user.email)
    
    // Create session - clean up existing sessions first for security
    await prisma.session.deleteMany({
      where: { 
        userId: user.id,
        expires: { lt: new Date() } // Remove expired sessions
      }
    })
    
    const sessionToken = crypto.randomUUID()
    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    })
    
    // Set secure cookie
    const cookieStore = cookies()
    cookieStore.set('session-token', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    })
    
    return NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: (user.profile as any)?.name || user.email
        },
        token
      },
      { status: 200 }
    )
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(authRateLimiter)(handler)