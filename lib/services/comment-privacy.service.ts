import crypto from 'crypto'

/**
 * Comment Privacy Service
 * Handles username anonymization and content privacy for Reddit comments
 * AC: 2.4 - Add username anonymization during storage
 */
export class CommentPrivacyService {
  private readonly hashSalt: string

  constructor() {
    // Use a consistent salt for anonymization
    this.hashSalt = process.env.ANONYMIZATION_SALT || 'default-salt-for-anonymization'
  }

  /**
   * Anonymize a username while maintaining consistency
   * Same username will always produce the same anonymized version
   */
  anonymizeUsername(username: string): string {
    if (!username || username === '[deleted]' || username === '[removed]') {
      return username
    }

    // Create a consistent hash of the username
    const hash = crypto
      .createHash('sha256')
      .update(username + this.hashSalt)
      .digest('hex')
      .substring(0, 8)

    return `user_${hash}`
  }

  /**
   * Sanitize comment content by removing personal information
   * This is a basic implementation - could be enhanced with more sophisticated PII detection
   */
  sanitizeContent(content: string): string {
    if (!content) return content

    // Remove common patterns that might contain personal information
    let sanitized = content
    
    // Remove email addresses
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email-removed]')
    
    // Remove phone numbers (basic pattern) - handles various formats
    sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone-removed]')
    sanitized = sanitized.replace(/\b\d{3}-\d{4}\b/g, '[phone-removed]') // For shorter formats like 555-1234
    
    // Remove URLs that might contain personal info
    sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, '[link-removed]')
    
    return sanitized
  }

  /**
   * Process comment for privacy compliance
   */
  processCommentForPrivacy(comment: {
    author: string
    content: string
  }): {
    anonymizedAuthor: string
    sanitizedContent: string
  } {
    return {
      anonymizedAuthor: this.anonymizeUsername(comment.author),
      sanitizedContent: this.sanitizeContent(comment.content)
    }
  }
}