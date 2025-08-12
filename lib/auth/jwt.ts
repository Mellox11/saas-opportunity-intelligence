import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

export class AuthService {
  private static get JWT_SECRET(): string {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required')
    }
    return secret
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
      return jwt.verify(token, this.JWT_SECRET) as { userId: string; email: string }
    } catch (error) {
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