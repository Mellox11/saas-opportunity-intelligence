import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * Session validation utility for middleware
 * Properly integrates with NextAuth JWT tokens
 */
export class SessionValidator {
  /**
   * Validate if request has valid NextAuth session
   * @param request - Next.js request object
   * @returns Promise<boolean> - true if valid session exists
   */
  static async validateRequest(request: NextRequest): Promise<boolean> {
    try {
      // Get JWT token using NextAuth's proper method
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      })
      
      // Return true if valid token exists
      return !!token
    } catch (error) {
      console.error('Session validation error:', error)
      return false
    }
  }

  /**
   * Get user ID from NextAuth token
   * @param request - Next.js request object  
   * @returns Promise<string | null> - user ID if authenticated
   */
  static async getUserId(request: NextRequest): Promise<string | null> {
    try {
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      })
      
      return token?.id as string || null
    } catch (error) {
      console.error('User ID extraction error:', error)
      return null
    }
  }
}