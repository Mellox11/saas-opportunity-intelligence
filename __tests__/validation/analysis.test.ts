import {
  configurationSchema,
  subredditValidationSchema,
  postEstimationSchema,
  PREDEFINED_KEYWORDS,
  type AnalysisConfiguration
} from '@/lib/validation/analysis-schema'

describe('Analysis Schema Validation', () => {
  describe('configurationSchema', () => {
    it('should validate a complete valid configuration', () => {
      const validConfig: AnalysisConfiguration = {
        subreddits: ['entrepreneur', 'startups'],
        timeRange: 30,
        keywords: {
          predefined: ['I hate', 'frustrating'],
          custom: ['custom keyword']
        },
        name: 'My Configuration'
      }

      const result = configurationSchema.safeParse(validConfig)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validConfig)
      }
    })

    it('should validate minimal configuration without name', () => {
      const minimalConfig = {
        subreddits: ['entrepreneur'],
        timeRange: 60,
        keywords: {
          predefined: [],
          custom: []
        }
      }

      const result = configurationSchema.safeParse(minimalConfig)
      expect(result.success).toBe(true)
    })

    it('should reject configuration with invalid subreddit format', () => {
      const invalidConfig = {
        subreddits: ['invalid-subreddit!'],
        timeRange: 30,
        keywords: { predefined: [], custom: [] }
      }

      const result = configurationSchema.safeParse(invalidConfig)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid subreddit format')
      }
    })

    it('should reject configuration with too many subreddits', () => {
      const invalidConfig = {
        subreddits: ['entrepreneur', 'startups', 'sideproject', 'freelance'],
        timeRange: 30,
        keywords: { predefined: [], custom: [] }
      }

      const result = configurationSchema.safeParse(invalidConfig)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Maximum 3 subreddits allowed')
      }
    })

    it('should reject configuration with no subreddits', () => {
      const invalidConfig = {
        subreddits: [],
        timeRange: 30,
        keywords: { predefined: [], custom: [] }
      }

      const result = configurationSchema.safeParse(invalidConfig)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('At least one subreddit is required')
      }
    })

    it('should reject invalid time range', () => {
      const invalidConfig = {
        subreddits: ['entrepreneur'],
        timeRange: 45,
        keywords: { predefined: [], custom: [] }
      }

      const result = configurationSchema.safeParse(invalidConfig)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Time range must be 30, 60, or 90 days')
      }
    })

    it('should reject custom keywords that are too long', () => {
      const invalidConfig = {
        subreddits: ['entrepreneur'],
        timeRange: 30,
        keywords: {
          predefined: [],
          custom: ['a'.repeat(51)] // 51 characters
        }
      }

      const result = configurationSchema.safeParse(invalidConfig)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Custom keyword cannot exceed 50 characters')
      }
    })

    it('should reject configuration name that is too long', () => {
      const invalidConfig = {
        subreddits: ['entrepreneur'],
        timeRange: 30,
        keywords: { predefined: [], custom: [] },
        name: 'a'.repeat(101) // 101 characters
      }

      const result = configurationSchema.safeParse(invalidConfig)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Configuration name cannot exceed 100 characters')
      }
    })
  })

  describe('subredditValidationSchema', () => {
    it('should validate correct subreddit format', () => {
      const validSubreddits = ['entrepreneur', 'JavaScript', 'webdev', 'react_native']
      
      validSubreddits.forEach(subreddit => {
        const result = subredditValidationSchema.safeParse({ subreddit })
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid subreddit formats', () => {
      const invalidSubreddits = ['invalid-subreddit', 'subreddit!', 'sub reddit', '']
      
      invalidSubreddits.forEach(subreddit => {
        const result = subredditValidationSchema.safeParse({ subreddit })
        expect(result.success).toBe(false)
      })
    })
  })

  describe('postEstimationSchema', () => {
    it('should validate post estimation request', () => {
      const validRequest = {
        subreddits: ['entrepreneur', 'startups'],
        timeRange: 30,
        keywords: {
          predefined: ['I hate'],
          custom: ['custom']
        }
      }

      const result = postEstimationSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should provide default empty arrays for keywords', () => {
      const requestWithoutKeywords = {
        subreddits: ['entrepreneur'],
        timeRange: 60
      }

      const result = postEstimationSchema.safeParse(requestWithoutKeywords)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.keywords.predefined).toEqual([])
        expect(result.data.keywords.custom).toEqual([])
      }
    })
  })

  describe('PREDEFINED_KEYWORDS', () => {
    it('should have all required keyword categories', () => {
      expect(PREDEFINED_KEYWORDS.frustration).toBeDefined()
      expect(PREDEFINED_KEYWORDS.needs).toBeDefined()
      expect(PREDEFINED_KEYWORDS.problems).toBeDefined()
      expect(PREDEFINED_KEYWORDS.solutions).toBeDefined()
    })

    it('should have keywords in each category', () => {
      Object.values(PREDEFINED_KEYWORDS).forEach(category => {
        expect(Array.isArray(category)).toBe(true)
        expect(category.length).toBeGreaterThan(0)
      })
    })

    it('should include expected frustration keywords', () => {
      expect(PREDEFINED_KEYWORDS.frustration).toContain('I hate')
      expect(PREDEFINED_KEYWORDS.frustration).toContain('frustrating')
      expect(PREDEFINED_KEYWORDS.frustration).toContain('broken')
    })

    it('should include expected needs keywords', () => {
      expect(PREDEFINED_KEYWORDS.needs).toContain('I need a tool')
      expect(PREDEFINED_KEYWORDS.needs).toContain('looking for')
      expect(PREDEFINED_KEYWORDS.needs).toContain('recommendations')
    })
  })
})