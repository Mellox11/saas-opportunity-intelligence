import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema
} from '@/lib/validation/auth-schema'

describe('Authentication Schema Validation', () => {
  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
        company: 'Acme Inc'
      }
      
      const result = registerSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
    
    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'Password123!',
        name: 'John Doe'
      }
      
      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].path).toContain('email')
    })
    
    it('should reject weak password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'weak',
        name: 'John Doe'
      }
      
      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues.some(issue => issue.path.includes('password'))).toBe(true)
    })
    
    it('should require name', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: ''
      }
      
      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].path).toContain('name')
    })
  })
  
  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123'
      }
      
      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
    
    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: ''
      }
      
      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].path).toContain('password')
    })
  })
  
  describe('forgotPasswordSchema', () => {
    it('should validate valid email', () => {
      const validData = {
        email: 'test@example.com'
      }
      
      const result = forgotPasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
    
    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email'
      }
      
      const result = forgotPasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
  
  describe('resetPasswordSchema', () => {
    it('should validate matching passwords', () => {
      const validData = {
        token: 'reset-token-123',
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      }
      
      const result = resetPasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
    
    it('should reject non-matching passwords', () => {
      const invalidData = {
        token: 'reset-token-123',
        password: 'NewPassword123!',
        confirmPassword: 'DifferentPassword123!'
      }
      
      const result = resetPasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].path).toContain('confirmPassword')
    })
  })
  
  describe('updateProfileSchema', () => {
    it('should validate valid profile data', () => {
      const validData = {
        name: 'John Doe',
        company: 'Acme Inc'
      }
      
      const result = updateProfileSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
    
    it('should allow empty company', () => {
      const validData = {
        name: 'John Doe',
        company: ''
      }
      
      const result = updateProfileSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
    
    it('should require name', () => {
      const invalidData = {
        name: '',
        company: 'Acme Inc'
      }
      
      const result = updateProfileSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].path).toContain('name')
    })
  })
})