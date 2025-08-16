import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { EnvironmentConfig } from '@/lib/config/environment'

export class AuthService {
  private static get JWT_SECRET(): string {
    return EnvironmentConfig.JWT_SECRET
  }
  
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
  }
  
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
  }
  
  static generateTokens(userId: string, email: string) {
    return jwt.sign(
      { userId, email },
      this.JWT_SECRET,
      { expiresIn: '7d' }
    )
  }
  
  static verifyToken(token: string) {
    try {
      const secret = this.JWT_SECRET
      console.log(`🔍 [AuthService] Verifying JWT with secret length: ${secret?.length || 'undefined'}`)
      console.log(`🔍 [AuthService] Token length: ${token?.length || 'undefined'}`)
      const result = jwt.verify(token, secret) as { userId: string; email: string }
      console.log(`✅ [AuthService] JWT verification successful for user: ${result.userId}`)
      return result
    } catch (error) {
      console.log(`❌ [AuthService] JWT verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return null
    }
  }
  
  static generateVerificationToken(): string {
    return randomUUID() + '-' + randomUUID() + '-' + Date.now()
  }
  
  static generatePasswordResetToken(): string {
    return randomUUID() + '-' + randomUUID() + '-' + Date.now()
  }
}

/**
 * Verify authentication from NextRequest
 * Compatible with API routes and Edge Runtime
 */
export async function verifyAuth(request: Request): Promise<{ valid: boolean; userId?: string; email?: string }> {
  try {
    const authHeader = request.headers.get('authorization')
    let token: string | undefined

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else {
      // Try to get token from cookies
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          acc[key] = value
          return acc
        }, {} as Record<string, string>)
        token = cookies['auth-token'] || cookies['session-token']
      }
    }

    if (!token) {
      return { valid: false }
    }

    // Try Edge Runtime compatible JWT verification first (if available)
    try {
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const { EdgeJWT } = await import('@/lib/auth/jwt-edge')
        const secret = process.env.JWT_SECRET
        if (secret) {
          const decoded = await EdgeJWT.verifyToken(token, secret)
          if (decoded) {
            return {
              valid: true,
              userId: decoded.userId,
              email: decoded.email
            }
          }
        }
      }
    } catch (edgeError) {
      // Fallback to regular JWT verification
      console.log('🔄 [verifyAuth] Edge JWT failed, falling back to regular JWT')
    }

    // Fallback to regular JWT verification
    const decoded = AuthService.verifyToken(token)
    if (!decoded) {
      return { valid: false }
    }

    return {
      valid: true,
      userId: decoded.userId,
      email: decoded.email
    }
  } catch (error) {
    console.log('❌ [verifyAuth] Authentication failed:', error instanceof Error ? error.message : 'Unknown error')
    return { valid: false }
  }
}