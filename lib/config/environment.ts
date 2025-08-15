// Note: Cannot import AppLogger here due to circular dependency
// AppLogger imports EnvironmentConfig, so we use console directly

/**
 * Environment configuration with startup validation
 * Prevents runtime failures by validating required variables at startup
 */
export class EnvironmentConfig {
  private static validated = false
  
  /**
   * Required environment variables
   */
  private static readonly REQUIRED_VARS = [
    'JWT_SECRET',
    'NEXTAUTH_SECRET', 
    'DATABASE_URL',
    'NEXTAUTH_URL'
  ] as const

  /**
   * Optional environment variables with defaults
   */
  private static readonly OPTIONAL_VARS = {
    NODE_ENV: 'development',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    REDIS_URL: '',
    OPENAI_API_KEY: '',
    REDDIT_CLIENT_ID: '',
    REDDIT_CLIENT_SECRET: '',
    PINECONE_API_KEY: '',
    PINECONE_ENVIRONMENT: '',
    PINECONE_INDEX_NAME: ''
  } as const

  /**
   * Validate all required environment variables at startup
   * Throws error if any required variables are missing
   */
  static validate(): void {
    if (this.validated) return

    const missing = this.REQUIRED_VARS.filter(key => !process.env[key])
    
    if (missing.length > 0) {
      const errorMessage = `Missing required environment variables: ${missing.join(', ')}`
      
      console.error('Environment validation failed:', {
        service: 'environment-config',
        operation: 'startup_validation',
        error: errorMessage,
        missing
      })
      
      throw new Error(
        errorMessage + '\n' +
        'Please check your .env files and ensure all required variables are set.'
      )
    }

    // Check for optional variables and log warnings
    const missingOptional = Object.keys(this.OPTIONAL_VARS).filter(
      key => !process.env[key] && key !== 'NODE_ENV' && key !== 'NEXT_PUBLIC_APP_URL'
    )
    
    if (missingOptional.length > 0) {
      console.warn('Optional environment variables not configured:', {
        service: 'environment-config',
        operation: 'startup_validation',
        warnings: missingOptional
      })
    }

    // Log successful validation
    console.log('Environment configuration validated successfully:', {
      service: 'environment-config',
      operation: 'startup_validation',
      requiredVars: this.REQUIRED_VARS.length,
      environment: process.env.NODE_ENV || 'development'
    })

    this.validated = true
  }

  /**
   * Get JWT secret with validation
   */
  static get JWT_SECRET(): string {
    if (!this.validated) this.validate()
    return process.env.JWT_SECRET!
  }

  /**
   * Get NextAuth secret with validation  
   */
  static get NEXTAUTH_SECRET(): string {
    if (!this.validated) this.validate()
    return process.env.NEXTAUTH_SECRET!
  }

  /**
   * Get database URL with validation
   */
  static get DATABASE_URL(): string {
    if (!this.validated) this.validate()
    return process.env.DATABASE_URL!
  }

  /**
   * Get NextAuth URL with validation
   */
  static get NEXTAUTH_URL(): string {
    if (!this.validated) this.validate()
    return process.env.NEXTAUTH_URL!
  }

  /**
   * Get environment with default
   */
  static get NODE_ENV(): string {
    return process.env.NODE_ENV || this.OPTIONAL_VARS.NODE_ENV
  }

  /**
   * Get app URL with default
   */
  static get APP_URL(): string {
    return process.env.NEXT_PUBLIC_APP_URL || this.OPTIONAL_VARS.NEXT_PUBLIC_APP_URL
  }

  /**
   * Check if running in production
   */
  static get isProduction(): boolean {
    return this.NODE_ENV === 'production'
  }

  /**
   * Check if running in development
   */
  static get isDevelopment(): boolean {
    return this.NODE_ENV === 'development'
  }
  
  /**
   * Get Redis URL if configured
   */
  static get REDIS_URL(): string | undefined {
    return process.env.REDIS_URL || undefined
  }
  
  /**
   * Get OpenAI API key if configured
   */
  static get OPENAI_API_KEY(): string | undefined {
    return process.env.OPENAI_API_KEY || undefined
  }
  
  /**
   * Check if Redis is configured
   */
  static get hasRedis(): boolean {
    return !!process.env.REDIS_URL
  }
  
  /**
   * Check if OpenAI is configured
   */
  static get hasOpenAI(): boolean {
    return !!process.env.OPENAI_API_KEY
  }
}

// Validate environment on module load in production
if (process.env.NODE_ENV === 'production') {
  EnvironmentConfig.validate()
}