import { POST, GET } from '@/app/api/feedback/dimension/route'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth/jwt'

// Mock NextRequest for testing
const createMockRequest = (url: string, options: { method: string; body?: any } = { method: 'GET' }) => {
  const mockRequest = {
    url,
    method: options.method,
    json: jest.fn().mockResolvedValue(options.body || {})
  }
  return mockRequest as any
}

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    opportunity: {
      findFirst: jest.fn()
    },
    dimensionFeedback: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    }
  }
}))

jest.mock('@/lib/auth/jwt')
jest.mock('@/lib/observability/logger')
jest.mock('@/lib/middleware/correlation', () => ({
  createCorrelatedLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}))

describe('/api/feedback/dimension', () => {
  const mockUserId = 'user-123'
  const mockOpportunityId = '550e8400-e29b-41d4-a716-446655440000'
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(verifyAuth as jest.Mock).mockResolvedValue({
      valid: true,
      userId: mockUserId
    })
  })

  describe('POST', () => {
    const validRequestData = {
      opportunityId: mockOpportunityId,
      dimensionName: 'emotionLevel',
      userRating: 'positive' as const
    }

    beforeEach(() => {
      ;(prisma.opportunity.findFirst as jest.Mock).mockResolvedValue({
        id: mockOpportunityId,
        analysis: { userId: mockUserId }
      })
    })

    it('should create new feedback successfully', async () => {
      ;(prisma.dimensionFeedback.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.dimensionFeedback.create as jest.Mock).mockResolvedValue({
        id: 'feedback-123',
        userRating: 'positive'
      })

      const request = createMockRequest('http://localhost/api/feedback/dimension', {
        method: 'POST',
        body: validRequestData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.feedback.userRating).toBe('positive')
      expect(data.feedback.isUpdate).toBe(false)

      expect(prisma.dimensionFeedback.create).toHaveBeenCalledWith({
        data: {
          opportunityId: mockOpportunityId,
          dimensionName: 'emotionLevel',
          userId: mockUserId,
          userRating: 'positive',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        }
      })
    })

    it('should update existing feedback', async () => {
      const existingFeedback = {
        id: 'feedback-123',
        userRating: 'negative'
      }
      
      ;(prisma.dimensionFeedback.findUnique as jest.Mock).mockResolvedValue(existingFeedback)
      ;(prisma.dimensionFeedback.update as jest.Mock).mockResolvedValue({
        id: 'feedback-123',
        userRating: 'positive'
      })

      const request = createMockRequest('http://localhost/api/feedback/dimension', {
        method: 'POST',
        body: validRequestData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.feedback.userRating).toBe('positive')
      expect(data.feedback.isUpdate).toBe(true)

      expect(prisma.dimensionFeedback.update).toHaveBeenCalledWith({
        where: { id: 'feedback-123' },
        data: {
          userRating: 'positive',
          updatedAt: expect.any(Date)
        }
      })
    })

    it('should return 401 for unauthenticated requests', async () => {
      ;(verifyAuth as jest.Mock).mockResolvedValue({
        valid: false,
        userId: null
      })

      const request = createMockRequest('http://localhost/api/feedback/dimension', {
        method: 'POST',
        body: validRequestData
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({
        error: 'Authentication required'
      })
    })

    it('should return 404 for invalid opportunity', async () => {
      ;(prisma.opportunity.findFirst as jest.Mock).mockResolvedValue(null)

      const request = createMockRequest('http://localhost/api/feedback/dimension', {
        method: 'POST',
        body: validRequestData
      })

      const response = await POST(request)

      expect(response.status).toBe(404)
      expect(await response.json()).toEqual({
        error: 'Opportunity not found or access denied'
      })
    })

    it('should validate request data', async () => {
      const invalidData = {
        opportunityId: 'invalid-uuid',
        dimensionName: '',
        userRating: 'invalid'
      }

      const request = createMockRequest('http://localhost/api/feedback/dimension', {
        method: 'POST',
        body: invalidData
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid data provided')
      expect(data.details).toBeDefined()
    })

    it('should handle database errors', async () => {
      ;(prisma.opportunity.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = createMockRequest('http://localhost/api/feedback/dimension', {
        method: 'POST',
        body: validRequestData
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({
        error: 'Internal server error'
      })
    })
  })

  describe('GET', () => {
    beforeEach(() => {
      ;(prisma.opportunity.findFirst as jest.Mock).mockResolvedValue({
        id: mockOpportunityId,
        analysis: { userId: mockUserId }
      })
    })

    it('should return feedback for opportunity', async () => {
      const mockFeedback = [
        {
          dimensionName: 'emotionLevel',
          userRating: 'positive',
          createdAt: new Date('2025-01-16T10:00:00Z'),
          updatedAt: new Date('2025-01-16T10:00:00Z')
        },
        {
          dimensionName: 'marketSize',
          userRating: 'negative',
          createdAt: new Date('2025-01-16T10:01:00Z'),
          updatedAt: new Date('2025-01-16T10:01:00Z')
        }
      ]

      ;(prisma.dimensionFeedback.findMany as jest.Mock).mockResolvedValue(mockFeedback)

      const url = `http://localhost/api/feedback/dimension?opportunityId=${mockOpportunityId}`
      const request = createMockRequest(url, { method: 'GET' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.feedback).toEqual({
        emotionLevel: {
          userRating: 'positive',
          createdAt: '2025-01-16T10:00:00.000Z',
          updatedAt: '2025-01-16T10:00:00.000Z'
        },
        marketSize: {
          userRating: 'negative',
          createdAt: '2025-01-16T10:01:00.000Z',
          updatedAt: '2025-01-16T10:01:00.000Z'
        }
      })
    })

    it('should return 400 for missing opportunityId', async () => {
      const request = createMockRequest('http://localhost/api/feedback/dimension', {
        method: 'GET'
      })

      const response = await GET(request)

      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({
        error: 'opportunityId parameter is required'
      })
    })

    it('should return 401 for unauthenticated requests', async () => {
      ;(verifyAuth as jest.Mock).mockResolvedValue({
        valid: false,
        userId: null
      })

      const url = `http://localhost/api/feedback/dimension?opportunityId=${mockOpportunityId}`
      const request = createMockRequest(url, { method: 'GET' })

      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should return empty feedback for opportunity with no feedback', async () => {
      ;(prisma.dimensionFeedback.findMany as jest.Mock).mockResolvedValue([])

      const url = `http://localhost/api/feedback/dimension?opportunityId=${mockOpportunityId}`
      const request = createMockRequest(url, { method: 'GET' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.feedback).toEqual({})
    })
  })
})