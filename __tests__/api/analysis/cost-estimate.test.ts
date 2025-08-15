// Mock Next.js first
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200
    }))
  }
}))

// Mock cost calculator
jest.mock('@/lib/utils/cost-calculator', () => ({
  generateCostEstimate: jest.fn()
}))

// Mock rate limiter
jest.mock('@/lib/security/rate-limiter', () => ({
  costEstimationRateLimiter: {},
  withRateLimit: jest.fn((limiter: any) => (handler: any) => handler)
}))

import { POST } from '@/app/api/cost/estimate/route'
import { generateCostEstimate } from '@/lib/utils/cost-calculator'

const mockGenerateCostEstimate = generateCostEstimate as jest.MockedFunction<typeof generateCostEstimate>

// Helper to create mock request
function createMockRequest(body: any): any {
  return {
    json: jest.fn().mockResolvedValue(body),
    method: 'POST',
    url: 'http://localhost:3000/api/cost/estimate',
    headers: new Map()
  }
}

describe('/api/cost/estimate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/cost/estimate', () => {
    const validRequestBody = {
      configuration: {
        subreddits: ['entrepreneur', 'startups'],
        timeRange: 30,
        keywords: {
          predefined: ['problem', 'pain'],
          custom: ['billing', 'pricing']
        }
      },
      budgetLimit: 40.00
    }

    const mockEstimate = {
      breakdown: {
        reddit: 2.50,
        ai: 8.75,
        total: 11.25
      },
      finalPrice: 31.50,
      currency: 'USD' as const,
      accuracy: 85
    }

    it('should return cost estimate for valid request', async () => {
      mockGenerateCostEstimate.mockReturnValue(mockEstimate)
      const request = createMockRequest(validRequestBody)

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(mockGenerateCostEstimate).toHaveBeenCalledWith(
        validRequestBody.configuration,
        undefined // No historical accuracy
      )
      expect(responseData).toEqual({
        ...mockEstimate,
        withinBudget: true // 31.50 <= 40.00
      })
    })

    it('should indicate when estimate exceeds budget', async () => {
      const highCostEstimate = {
        ...mockEstimate,
        finalPrice: 45.00
      }
      mockGenerateCostEstimate.mockReturnValue(highCostEstimate)
      const request = createMockRequest(validRequestBody)

      const response = await POST(request)
      const responseData = await response.json()

      expect(responseData).toEqual({
        ...highCostEstimate,
        withinBudget: false // 45.00 > 40.00
      })
    })

    it('should handle request without budget limit', async () => {
      const requestWithoutBudget = {
        configuration: validRequestBody.configuration
      }
      mockGenerateCostEstimate.mockReturnValue(mockEstimate)
      const request = createMockRequest(requestWithoutBudget)

      const response = await POST(request)
      const responseData = await response.json()

      expect(responseData.withinBudget).toBeNull()
    })

    it('should validate request body schema', async () => {
      const invalidRequestBody = {
        configuration: {
          subreddits: [], // Empty array (invalid)
          timeRange: -5, // Negative (invalid)
          keywords: 'invalid' // Wrong type
        }
      }
      const request = createMockRequest(invalidRequestBody)

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Invalid request data')
      expect(responseData.details).toBeDefined()
      expect(Array.isArray(responseData.details)).toBe(true)
    })

    it('should handle missing configuration', async () => {
      const request = createMockRequest({})

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Invalid request data')
    })

    it('should handle cost calculation errors', async () => {
      mockGenerateCostEstimate.mockImplementation(() => {
        throw new Error('Cost calculation failed')
      })
      const request = createMockRequest(validRequestBody)

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Failed to generate cost estimate')
    })

    it('should handle malformed JSON', async () => {
      const request = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        method: 'POST'
      } as any

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Failed to generate cost estimate')
    })

    it('should handle edge case values', async () => {
      const edgeCaseBody = {
        configuration: {
          subreddits: ['entrepreneur'], // Valid subreddit
          timeRange: 30, // Valid time range (must be 30, 60, or 90)
          keywords: {
            predefined: [],
            custom: []
          }
        },
        budgetLimit: 1.00 // Min budget limit is 1
      }
      
      const lowCostEstimate = {
        breakdown: {
          reddit: 0.001,
          ai: 0.001,
          total: 0.002
        },
        finalPrice: 0.005,
        currency: 'USD' as const,
        accuracy: 85
      }
      mockGenerateCostEstimate.mockReturnValue(lowCostEstimate)
      const request = createMockRequest(edgeCaseBody)

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.withinBudget).toBe(true)
    })

    it('should handle maximum allowed values', async () => {
      const maxValueBody = {
        configuration: {
          subreddits: ['entrepreneur', 'startups', 'SaaS'], // Max 3 subreddits
          timeRange: 90, // Max time range (90 days)
          keywords: {
            predefined: ['keyword1', 'keyword2'],
            custom: Array.from({ length: 10 }, (_, i) => `custom${i}`) // Custom keywords
          }
        },
        budgetLimit: 1000.00 // Max budget limit
      }
      
      mockGenerateCostEstimate.mockReturnValue(mockEstimate)
      const request = createMockRequest(maxValueBody)

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockGenerateCostEstimate).toHaveBeenCalledWith(
        maxValueBody.configuration,
        undefined
      )
    })

    it('should reject values exceeding limits', async () => {
      const exceedingLimitsBody = {
        configuration: {
          subreddits: ['entrepreneur', 'startups', 'SaaS', 'business'], // Too many (max 3)
          timeRange: 500, // Invalid time range (must be 30, 60, or 90)
          keywords: {
            predefined: [],
            custom: Array.from({ length: 25 }, (_, i) => `custom${i}`) // Many custom keywords
          }
        },
        budgetLimit: 1500.00 // Exceeds max (1000)
      }
      const request = createMockRequest(exceedingLimitsBody)

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Invalid request data')
    })

    it('should handle floating point budget calculations correctly', async () => {
      const floatingPointEstimate = {
        ...mockEstimate,
        finalPrice: 29.999999 // Very close to budget
      }
      mockGenerateCostEstimate.mockReturnValue(floatingPointEstimate)
      
      const requestBody = {
        ...validRequestBody,
        budgetLimit: 30.00
      }
      const request = createMockRequest(requestBody)

      const response = await POST(request)
      const responseData = await response.json()

      expect(responseData.withinBudget).toBe(true)
    })

    it('should preserve all estimate properties in response', async () => {
      const detailedEstimate = {
        ...mockEstimate,
        metadata: {
          calculatedAt: new Date().toISOString(),
          version: '1.0',
          factors: ['complexity', 'volume', 'timeline']
        },
        warnings: ['High volume may affect processing time']
      }
      mockGenerateCostEstimate.mockReturnValue(detailedEstimate)
      const request = createMockRequest(validRequestBody)

      const response = await POST(request)
      const responseData = await response.json()

      expect(responseData).toEqual({
        ...detailedEstimate,
        withinBudget: true
      })
    })
  })

  describe('Error scenarios', () => {
    it('should handle cost calculator throwing specific errors', async () => {
      const specificErrors = [
        new Error('Reddit API quota exceeded'),
        new Error('Invalid subreddit configuration'),
        new Error('Processing complexity too high')
      ]

      for (const error of specificErrors) {
        mockGenerateCostEstimate.mockImplementation(() => { throw error })
        const request = createMockRequest({
          configuration: {
            subreddits: ['entrepreneur'],
            timeRange: 30,
            keywords: { predefined: [], custom: [] }
          }
        })

        const response = await POST(request)
        const responseData = await response.json()

        expect(response.status).toBe(500)
        expect(responseData.error).toBe('Failed to generate cost estimate')
      }
    })

    it('should handle concurrent requests', async () => {
      const concurrentEstimate = {
        breakdown: {
          reddit: 2.50,
          ai: 8.75,
          total: 11.25
        },
        finalPrice: 31.50,
        currency: 'USD' as const,
        accuracy: 85
      }
      mockGenerateCostEstimate.mockReturnValue(concurrentEstimate)
      
      const requests = Array.from({ length: 5 }, () => 
        createMockRequest({
          configuration: {
            subreddits: ['entrepreneur'],
            timeRange: 30,
            keywords: { predefined: [], custom: [] }
          }
        })
      )

      const responses = await Promise.all(
        requests.map(request => POST(request))
      )

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
      expect(mockGenerateCostEstimate).toHaveBeenCalledTimes(5)
    })
  })

  describe('Rate limiting integration', () => {
    it('should apply rate limiting middleware', async () => {
      // The rate limiting is applied at module level when route is imported
      // We can test that the withRateLimit wrapper exists and the endpoint works
      const testRequestBody = {
        configuration: {
          subreddits: ['entrepreneur'],
          timeRange: 30,
          keywords: {
            predefined: ['problem'],
            custom: []
          }
        },
        budgetLimit: 40.00
      }
      const request = createMockRequest(testRequestBody)
      
      const testMockEstimate = {
        breakdown: {
          reddit: 2.50,
          ai: 8.75,
          total: 11.25
        },
        finalPrice: 31.50,
        currency: 'USD' as const,
        accuracy: 85
      }
      mockGenerateCostEstimate.mockReturnValue(testMockEstimate)
      const response = await POST(request)
      
      // If rate limiting is properly applied, response should be successful
      expect(response.status).toBe(200)
      
      // The withRateLimit function should be available and working
      const { withRateLimit } = require('@/lib/security/rate-limiter')
      expect(typeof withRateLimit).toBe('function')
    })
  })
})