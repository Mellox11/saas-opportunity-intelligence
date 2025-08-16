import { CommentPrivacyService } from '@/lib/services/comment-privacy.service'

describe('CommentPrivacyService', () => {
  let privacyService: CommentPrivacyService

  beforeEach(() => {
    privacyService = new CommentPrivacyService()
  })

  describe('anonymizeUsername', () => {
    it('should anonymize usernames consistently', () => {
      const username = 'testuser123'
      const anonymized1 = privacyService.anonymizeUsername(username)
      const anonymized2 = privacyService.anonymizeUsername(username)
      
      expect(anonymized1).toBe(anonymized2)
      expect(anonymized1).toMatch(/^user_[a-f0-9]{8}$/)
      expect(anonymized1).not.toBe(username)
    })

    it('should handle deleted users', () => {
      expect(privacyService.anonymizeUsername('[deleted]')).toBe('[deleted]')
      expect(privacyService.anonymizeUsername('[removed]')).toBe('[removed]')
    })

    it('should handle empty usernames', () => {
      expect(privacyService.anonymizeUsername('')).toBe('')
      expect(privacyService.anonymizeUsername(null as any)).toBe(null)
      expect(privacyService.anonymizeUsername(undefined as any)).toBe(undefined)
    })

    it('should produce different hashes for different usernames', () => {
      const user1 = privacyService.anonymizeUsername('user1')
      const user2 = privacyService.anonymizeUsername('user2')
      
      expect(user1).not.toBe(user2)
    })
  })

  describe('sanitizeContent', () => {
    it('should remove email addresses', () => {
      const content = 'Contact me at test@example.com for more info'
      const sanitized = privacyService.sanitizeContent(content)
      
      expect(sanitized).toBe('Contact me at [email-removed] for more info')
      expect(sanitized).not.toContain('test@example.com')
    })

    it('should remove phone numbers', () => {
      const content = 'Call me at 555-123-4567 or 555.987.6543'
      const sanitized = privacyService.sanitizeContent(content)
      
      expect(sanitized).toBe('Call me at [phone-removed] or [phone-removed]')
      expect(sanitized).not.toContain('555-123-4567')
      expect(sanitized).not.toContain('555.987.6543')
    })

    it('should remove URLs', () => {
      const content = 'Check out https://example.com/my-profile for details'
      const sanitized = privacyService.sanitizeContent(content)
      
      expect(sanitized).toBe('Check out [link-removed] for details')
      expect(sanitized).not.toContain('https://example.com/my-profile')
    })

    it('should handle multiple types of PII', () => {
      const content = 'Email me at john@example.com or call 555-1234 or visit https://mysite.com'
      const sanitized = privacyService.sanitizeContent(content)
      
      expect(sanitized).toBe('Email me at [email-removed] or call [phone-removed] or visit [link-removed]')
    })

    it('should handle empty content', () => {
      expect(privacyService.sanitizeContent('')).toBe('')
      expect(privacyService.sanitizeContent(null as any)).toBe(null)
      expect(privacyService.sanitizeContent(undefined as any)).toBe(undefined)
    })
  })

  describe('processCommentForPrivacy', () => {
    it('should process both author and content', () => {
      const comment = {
        author: 'testuser',
        content: 'Contact me at test@example.com'
      }

      const result = privacyService.processCommentForPrivacy(comment)

      expect(result.anonymizedAuthor).toMatch(/^user_[a-f0-9]{8}$/)
      expect(result.sanitizedContent).toBe('Contact me at [email-removed]')
    })

    it('should handle deleted users in processing', () => {
      const comment = {
        author: '[deleted]',
        content: 'This is a normal comment'
      }

      const result = privacyService.processCommentForPrivacy(comment)

      expect(result.anonymizedAuthor).toBe('[deleted]')
      expect(result.sanitizedContent).toBe('This is a normal comment')
    })
  })
})