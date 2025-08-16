/**
 * Edge Runtime compatible JWT verification
 * Uses Web Crypto API instead of Node.js crypto
 */

interface JWTPayload {
  userId: string
  email: string
  iat: number
  exp: number
}

export class EdgeJWT {
  /**
   * Verify JWT token using Web Crypto API (Edge Runtime compatible)
   */
  static async verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
    try {
      console.log(`🔍 [EdgeJWT] Verifying token with secret length: ${secret?.length}`)
      console.log(`🔍 [EdgeJWT] Token length: ${token?.length}`)
      
      const parts = token.split('.')
      if (parts.length !== 3) {
        console.log(`❌ [EdgeJWT] Invalid token format: expected 3 parts, got ${parts.length}`)
        return null
      }
      
      const [header, payload, signature] = parts
      
      // Decode header and payload
      const decodedHeader = JSON.parse(this.base64UrlDecode(header))
      const decodedPayload = JSON.parse(this.base64UrlDecode(payload)) as JWTPayload
      
      console.log(`🔍 [EdgeJWT] Header:`, decodedHeader)
      console.log(`🔍 [EdgeJWT] Payload user: ${decodedPayload.userId}`)
      console.log(`🔍 [EdgeJWT] Token expires: ${new Date(decodedPayload.exp * 1000)}`)
      
      // Check expiration
      if (decodedPayload.exp && Date.now() >= decodedPayload.exp * 1000) {
        console.log(`❌ [EdgeJWT] Token expired`)
        return null
      }
      
      // Verify signature using Web Crypto API
      const signatureIsValid = await this.verifySignature(
        `${header}.${payload}`,
        signature,
        secret
      )
      
      if (!signatureIsValid) {
        console.log(`❌ [EdgeJWT] Invalid signature`)
        return null
      }
      
      console.log(`✅ [EdgeJWT] Token verification successful for user: ${decodedPayload.userId}`)
      return decodedPayload
      
    } catch (error) {
      console.log(`❌ [EdgeJWT] Verification error: ${error.message}`)
      return null
    }
  }
  
  /**
   * Verify HMAC signature using Web Crypto API
   */
  private static async verifySignature(
    data: string,
    signature: string,
    secret: string
  ): Promise<boolean> {
    try {
      // Import secret as crypto key
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      )
      
      // Verify signature
      const signatureBuffer = this.base64UrlDecodeToBuffer(signature)
      const dataBuffer = encoder.encode(data)
      
      return await crypto.subtle.verify('HMAC', key, signatureBuffer, dataBuffer)
    } catch (error) {
      console.log(`❌ [EdgeJWT] Signature verification error: ${error.message}`)
      return false
    }
  }
  
  /**
   * Base64URL decode to string
   */
  private static base64UrlDecode(str: string): string {
    // Add padding if needed
    const padded = str + '='.repeat((4 - str.length % 4) % 4)
    // Replace URL-safe characters
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
    return atob(base64)
  }
  
  /**
   * Base64URL decode to ArrayBuffer
   */
  private static base64UrlDecodeToBuffer(str: string): ArrayBuffer {
    const padded = str + '='.repeat((4 - str.length % 4) % 4)
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(base64)
    const buffer = new ArrayBuffer(binary.length)
    const view = new Uint8Array(buffer)
    for (let i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i)
    }
    return buffer
  }
}