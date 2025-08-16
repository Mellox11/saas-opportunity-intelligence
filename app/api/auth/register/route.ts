import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AuthService } from '@/lib/auth/jwt'
import { registerSchema } from '@/lib/validation/auth-schema'
import { authRateLimiter, withRateLimit } from '@/lib/security/rate-limiter'
import { emailService } from '@/lib/email/email-service'
import { ApiErrorHandler } from '@/lib/utils/api-response'

async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = registerSchema.parse(body)
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })
    
    if (existingUser) {
      return ApiErrorHandler.validationError('Email already registered')
    }
    
    // Hash password
    const passwordHash = await AuthService.hashPassword(validatedData.password)
    
    // Create user (auto-verify in development)
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        passwordHash,
        emailVerified: process.env.NODE_ENV === 'development', // Auto-verify in development
        profile: JSON.stringify({
          name: validatedData.name,
          company: validatedData.company || null
        })
      }
    })
    
    // Create verification token
    const verificationToken = AuthService.generateVerificationToken()
    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token: verificationToken,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        userId: user.id
      }
    })
    
    // Send verification email
    try {
      await emailService.sendVerificationEmail(user.email, verificationToken)
    } catch (emailError) {
      console.error('Email sending failed:', emailError)
      // Continue registration even if email fails
    }
    
    return ApiErrorHandler.success(
      { 
        message: process.env.NODE_ENV === 'development' 
          ? 'Registration successful! Account auto-verified for development. You can now log in.'
          : 'Registration successful. Please check your email to verify your account.',
        userId: user.id
      },
      201
    )
  } catch (error: any) {
    return ApiErrorHandler.handleError(error, 'Registration')
  }
}

export const POST = process.env.NODE_ENV === 'development' ? handler : withRateLimit(authRateLimiter)(handler)