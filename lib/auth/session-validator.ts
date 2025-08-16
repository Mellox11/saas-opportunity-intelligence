import { NextRequest } from 'next/server'
import { AuthService } from '@/lib/auth/jwt'
import { EdgeJWT } from '@/lib/auth/jwt-edge'

/**
 * Session validation utility for middleware
 * Works with custom JWT authentication system in Edge Runtime
 * Cannot use Prisma in middleware due to Edge Runtime limitations
 */
export class SessionValidator {
  /**
   * Validate if request has valid JWT token
   * @param request - Next.js request object
   * @returns Promise<boolean> - true if valid session exists
   */
  static async validateRequest(request: NextRequest): Promise<boolean> {
    try {
      const pathname = request.nextUrl.pathname
      console.log(`🔍 [SessionValidator] Validating request for: ${pathname}`)
      
      // Check for Authorization header with Bearer token
      const authHeader = request.headers.get('authorization')
      console.log(`🔍 [SessionValidator] Authorization header: ${authHeader ? 'present' : 'missing'}`)
      
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        console.log(`🔍 [SessionValidator] Bearer token found, length: ${token.length}`)
        // Try Edge Runtime compatible JWT verification first
        const secret = process.env.JWT_SECRET
        if (secret) {
          const decoded = await EdgeJWT.verifyToken(token, secret)
          console.log(`🔍 [SessionValidator] Bearer token valid (EdgeJWT): ${!!decoded}`)
          if (decoded) {
            console.log(`✅ [SessionValidator] Authenticated via Bearer token for user: ${decoded.userId}`)
            return true
          }
        }
        // Fallback to regular JWT library
        const decodedFallback = AuthService.verifyToken(token)
        console.log(`🔍 [SessionValidator] Bearer token valid (fallback): ${!!decodedFallback}`)
        if (decodedFallback) {
          console.log(`✅ [SessionValidator] Authenticated via Bearer token (fallback) for user: ${decodedFallback.userId}`)
          return true
        }
      }

      // Check for auth-token cookie (set by frontend after login)
      const authTokenCookie = request.cookies.get('auth-token')?.value
      console.log(`🔍 [SessionValidator] auth-token cookie: ${authTokenCookie ? `present (${authTokenCookie.length} chars)` : 'missing'}`)
      
      if (authTokenCookie) {
        // Try Edge Runtime compatible JWT verification first
        const secret = process.env.JWT_SECRET
        if (secret) {
          const decoded = await EdgeJWT.verifyToken(authTokenCookie, secret)
          console.log(`🔍 [SessionValidator] auth-token cookie valid (EdgeJWT): ${!!decoded}`)
          if (decoded) {
            console.log(`✅ [SessionValidator] Authenticated via auth-token cookie for user: ${decoded.userId}`)
            return true
          }
        }
        // Fallback to regular JWT library
        const decodedFallback = AuthService.verifyToken(authTokenCookie)
        console.log(`🔍 [SessionValidator] auth-token cookie valid (fallback): ${!!decodedFallback}`)
        if (decodedFallback) {
          console.log(`✅ [SessionValidator] Authenticated via auth-token cookie (fallback) for user: ${decodedFallback.userId}`)
          return true
        }
      }

      // Check for JWT in session-token cookie (primary method)
      const sessionTokenCookie = request.cookies.get('session-token')?.value
      console.log(`🔍 [SessionValidator] session-token cookie: ${sessionTokenCookie ? `present (${sessionTokenCookie.length} chars)` : 'missing'}`)
      
      if (sessionTokenCookie) {
        // Try Edge Runtime compatible JWT verification first
        const secret = process.env.JWT_SECRET
        if (secret) {
          const decoded = await EdgeJWT.verifyToken(sessionTokenCookie, secret)
          console.log(`🔍 [SessionValidator] session-token cookie JWT valid (EdgeJWT): ${!!decoded}`)
          if (decoded) {
            console.log(`✅ [SessionValidator] Authenticated via session-token cookie for user: ${decoded.userId}`)
            return true
          }
        }
        // Fallback to regular JWT library
        const decodedFallback = AuthService.verifyToken(sessionTokenCookie)
        console.log(`🔍 [SessionValidator] session-token cookie JWT valid (fallback): ${!!decodedFallback}`)
        if (decodedFallback) {
          console.log(`✅ [SessionValidator] Authenticated via session-token cookie (fallback) for user: ${decodedFallback.userId}`)
          return true
        }
      }

      console.log(`❌ [SessionValidator] No valid authentication found for: ${pathname}`)
      return false
    } catch (error) {
      console.error('❌ [SessionValidator] Session validation error:', error)
      return false
    }
  }

  /**
   * Get user ID from JWT token
   * @param request - Next.js request object  
   * @returns Promise<string | null> - user ID if authenticated
   */
  static async getUserId(request: NextRequest): Promise<string | null> {
    try {
      const secret = process.env.JWT_SECRET
      
      // Check Authorization header first
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        if (secret) {
          const decoded = await EdgeJWT.verifyToken(token, secret)
          if (decoded) return decoded.userId
        }
        const decodedFallback = AuthService.verifyToken(token)
        return decodedFallback?.userId || null
      }

      // Check auth-token cookie
      const authTokenCookie = request.cookies.get('auth-token')?.value
      if (authTokenCookie) {
        if (secret) {
          const decoded = await EdgeJWT.verifyToken(authTokenCookie, secret)
          if (decoded) return decoded.userId
        }
        const decodedFallback = AuthService.verifyToken(authTokenCookie)
        return decodedFallback?.userId || null
      }

      // Check session-token cookie
      const sessionTokenCookie = request.cookies.get('session-token')?.value
      if (sessionTokenCookie) {
        if (secret) {
          const decoded = await EdgeJWT.verifyToken(sessionTokenCookie, secret)
          if (decoded) return decoded.userId
        }
        const decodedFallback = AuthService.verifyToken(sessionTokenCookie)
        return decodedFallback?.userId || null
      }

      return null
    } catch (error) {
      console.error('User ID extraction error:', error)
      return null
    }
  }
}