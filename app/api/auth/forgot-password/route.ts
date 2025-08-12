import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AuthService } from '@/lib/auth/jwt'
import { forgotPasswordSchema } from '@/lib/validation/auth-schema'
import { authRateLimiter, withRateLimit } from '@/lib/security/rate-limiter'
import { emailService } from '@/lib/email/email-service'

async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = forgotPasswordSchema.parse(body)
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })
    
    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json(
        { message: 'If an account exists with this email, you will receive a password reset link.' },
        { status: 200 }
      )
    }
    
    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    })
    
    // Create new reset token
    const resetToken = AuthService.generatePasswordResetToken()
    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      }
    })
    
    // Send reset email
    await emailService.sendPasswordResetEmail(user.email, resetToken)
    
    return NextResponse.json(
      { message: 'If an account exists with this email, you will receive a password reset link.' },
      { status: 200 }
    )
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Failed to process request. Please try again.' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(authRateLimiter)(handler)