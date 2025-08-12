import { AuthService } from '../jwt'

describe('AuthService', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123'
      const hashedPassword = await AuthService.hashPassword(password)
      
      expect(hashedPassword).toBeDefined()
      expect(hashedPassword).not.toBe(password)
      expect(hashedPassword.length).toBeGreaterThan(0)
    })
    
    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123'
      const hash1 = await AuthService.hashPassword(password)
      const hash2 = await AuthService.hashPassword(password)
      
      expect(hash1).not.toBe(hash2)
    })
  })
  
  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testPassword123'
      const hashedPassword = await AuthService.hashPassword(password)
      
      const isValid = await AuthService.verifyPassword(password, hashedPassword)
      expect(isValid).toBe(true)
    })
    
    it('should reject incorrect password', async () => {
      const password = 'testPassword123'
      const wrongPassword = 'wrongPassword'
      const hashedPassword = await AuthService.hashPassword(password)
      
      const isValid = await AuthService.verifyPassword(wrongPassword, hashedPassword)
      expect(isValid).toBe(false)
    })
  })
  
  describe('generateTokens', () => {
    it('should generate a valid JWT token', () => {
      const userId = 'user-123'
      const email = 'test@example.com'
      
      const token = AuthService.generateTokens(userId, email)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })
  })
  
  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const userId = 'user-123'
      const email = 'test@example.com'
      
      const token = AuthService.generateTokens(userId, email)
      const decoded = AuthService.verifyToken(token)
      
      expect(decoded).toBeDefined()
      expect(decoded?.userId).toBe(userId)
      expect(decoded?.email).toBe(email)
    })
    
    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.token.here'
      const decoded = AuthService.verifyToken(invalidToken)
      
      expect(decoded).toBeNull()
    })
  })
  
  describe('generateVerificationToken', () => {
    it('should generate unique verification tokens', () => {
      const token1 = AuthService.generateVerificationToken()
      const token2 = AuthService.generateVerificationToken()
      
      expect(token1).toBeDefined()
      expect(token2).toBeDefined()
      expect(token1).not.toBe(token2)
    })
  })
  
  describe('generatePasswordResetToken', () => {
    it('should generate unique password reset tokens', () => {
      const token1 = AuthService.generatePasswordResetToken()
      const token2 = AuthService.generatePasswordResetToken()
      
      expect(token1).toBeDefined()
      expect(token2).toBeDefined()
      expect(token1).not.toBe(token2)
    })
  })
})