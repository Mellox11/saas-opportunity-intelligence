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
      console.log(`❌ [AuthService] JWT verification failed: ${error.message}`)
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