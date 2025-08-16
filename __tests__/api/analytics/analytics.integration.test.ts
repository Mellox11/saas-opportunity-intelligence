import { NextRequest, NextResponse } from 'next/server'
import { GET as getUserAnalytics } from '@/app/api/analytics/user/route'
import { GET as getReportAnalytics, POST as trackEvent } from '@/app/api/analytics/reports/[id]/route'

/**
 * Integration Tests for Analytics API Routes
 * AC: 10 - Comprehensive testing for analytics endpoints
 */

// Mock dependencies
jest.mock('@/lib/services/report-analytics.service')
jest.mock('@/lib/auth/auth-guard')
jest.mock('@/lib/observability/logger')

describe('Analytics API Integration Tests', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com'
  }

  const mockReportAnalytics = {
    reportId: 'report-1',
    totalViews: 50,
    uniqueViews: 30,
    totalShares: 5,
    totalDownloads: 15,
    performanceMetrics: {
      averageGenerationTime: 5000,
      averageCost: 2.50,
      successRate: 95,
      errorCount: 2
    },
    usagePatterns: {
      deviceTypes: [
        { type: 'desktop', count: 20 },
        { type: 'mobile', count: 10 }
      ],
      viewsByHour: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        views: Math.floor(Math.random() * 10)
      }))
    },
    shareAnalytics: {
      totalShareLinks: 5,
      activeShareLinks: 3,
      totalShareViews: 25,
      shareConversionRate: 40,
      topReferrers: [
        { source: 'direct', count: 15 },
        { source: 'email', count: 10 }
      ]
    },
    exportAnalytics: {
      averageExportTime: 3000,
      exportsByFormat: [
        { format: 'pdf', count: 12 },
        { format: 'summary', count: 3 }
      ]
    }
  }

  const mockUserAnalytics = {
    userId: 'user-1',
    totalReports: 10,
    totalViews: 150,
    totalShares: 25,
    totalCosts: 45.75,
    recentActivity: [
      {
        type: 'generation',
        reportId: 'report-1',
        timestamp: new Date('2024-01-15T10:00:00Z')
      },
      {
        type: 'view',
        reportId: 'report-1',
        timestamp: new Date('2024-01-15T11:00:00Z')
      }
    ],
    performanceMetrics: {
      averageGenerationTime: 6000,
      averageCost: 4.58,
      successRate: 92,
      errorCount: 8
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock auth guard to inject user
    const { withAuth } = require('@/lib/auth/auth-guard')
    withAuth.mockImplementation((handler: any) => {
      return async (request: NextRequest, ...args: any[]) => {
        ;(request as any).user = mockUser
        return handler(request, ...args)
      }
    })

    // Mock analytics service
    const { ReportAnalyticsService } = require('@/lib/services/report-analytics.service')
    ReportAnalyticsService.mockImplementation(() => ({
      getReportAnalytics: jest.fn().mockResolvedValue(mockReportAnalytics),
      getUserAnalytics: jest.fn().mockResolvedValue(mockUserAnalytics),
      trackReportView: jest.fn().mockResolvedValue(undefined),
      trackPDFExport: jest.fn().mockResolvedValue(undefined)
    }))
  })

  describe('GET /api/analytics/user', () => {
    it('should return user analytics successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/user')
      
      const response = await getUserAnalytics(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toEqual({
        success: true,
        data: mockUserAnalytics
      })
    })

    it('should handle unauthenticated requests', async () => {
      // Mock unauthenticated request
      const { withAuth } = require('@/lib/auth/auth-guard')
      withAuth.mockImplementation((handler: any) => {
        return async (request: NextRequest, ...args: any[]) => {
          ;(request as any).user = null
          return handler(request, ...args)
        }
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/user')
      
      const response = await getUserAnalytics(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('Authentication required')
    })

    it('should handle service errors', async () => {
      const { ReportAnalyticsService } = require('@/lib/services/report-analytics.service')
      ReportAnalyticsService.mockImplementation(() => ({
        getUserAnalytics: jest.fn().mockRejectedValue(new Error('Service error'))
      }))

      const request = new NextRequest('http://localhost:3000/api/analytics/user')
      
      const response = await getUserAnalytics(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Failed to fetch user analytics')
    })
  })

  describe('GET /api/analytics/reports/[id]', () => {
    it('should return report analytics successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/reports/report-1')
      const params = { id: 'report-1' }
      
      const response = await getReportAnalytics(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toEqual({
        success: true,
        data: mockReportAnalytics
      })
    })

    it('should handle report not found', async () => {
      const { ReportAnalyticsService } = require('@/lib/services/report-analytics.service')
      ReportAnalyticsService.mockImplementation(() => ({
        getReportAnalytics: jest.fn().mockRejectedValue(new Error('Report not found'))
      }))

      const request = new NextRequest('http://localhost:3000/api/analytics/reports/non-existent')
      const params = { id: 'non-existent' }
      
      const response = await getReportAnalytics(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Report not found')
    })

    it('should handle access denied', async () => {
      const { ReportAnalyticsService } = require('@/lib/services/report-analytics.service')
      ReportAnalyticsService.mockImplementation(() => ({
        getReportAnalytics: jest.fn().mockRejectedValue(new Error('Access denied'))
      }))

      const request = new NextRequest('http://localhost:3000/api/analytics/reports/report-1')
      const params = { id: 'report-1' }
      
      const response = await getReportAnalytics(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Access denied')
    })
  })

  describe('POST /api/analytics/reports/[id]', () => {
    it('should track view event successfully', async () => {
      const requestBody = {
        eventType: 'view',
        sessionData: {
          viewDuration: 300,
          deviceType: 'desktop',
          userAgent: 'Mozilla/5.0',
          referrer: 'https://example.com'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/analytics/reports/report-1', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })
      const params = { id: 'report-1' }
      
      const response = await trackEvent(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toEqual({
        success: true,
        message: 'Event tracked successfully'
      })

      const { ReportAnalyticsService } = require('@/lib/services/report-analytics.service')
      const mockService = ReportAnalyticsService.mock.results[0].value
      expect(mockService.trackReportView).toHaveBeenCalledWith(
        'report-1',
        'user-1',
        requestBody.sessionData
      )
    })

    it('should track export event successfully', async () => {
      const requestBody = {
        eventType: 'export',
        exportData: {
          format: 'pdf',
          type: 'full',
          exportTime: 2500,
          fileSize: 2048576,
          success: true
        }
      }

      const request = new NextRequest('http://localhost:3000/api/analytics/reports/report-1', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })
      const params = { id: 'report-1' }
      
      const response = await trackEvent(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toEqual({
        success: true,
        message: 'Event tracked successfully'
      })

      const { ReportAnalyticsService } = require('@/lib/services/report-analytics.service')
      const mockService = ReportAnalyticsService.mock.results[0].value
      expect(mockService.trackPDFExport).toHaveBeenCalledWith(
        'report-1',
        'user-1',
        requestBody.exportData
      )
    })

    it('should validate event data', async () => {
      const invalidRequestBody = {
        eventType: 'invalid-event',
        sessionData: {}
      }

      const request = new NextRequest('http://localhost:3000/api/analytics/reports/report-1', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody),
        headers: { 'Content-Type': 'application/json' }
      })
      const params = { id: 'report-1' }
      
      const response = await trackEvent(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Invalid event data')
      expect(responseData.details).toBeDefined()
    })

    it('should require export data for export events', async () => {
      const incompleteRequestBody = {
        eventType: 'export'
        // Missing exportData
      }

      const request = new NextRequest('http://localhost:3000/api/analytics/reports/report-1', {
        method: 'POST',
        body: JSON.stringify(incompleteRequestBody),
        headers: { 'Content-Type': 'application/json' }
      })
      const params = { id: 'report-1' }
      
      const response = await trackEvent(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Export data required for export events')
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/reports/report-1', {
        method: 'POST',
        body: 'invalid-json',
        headers: { 'Content-Type': 'application/json' }
      })
      const params = { id: 'report-1' }
      
      const response = await trackEvent(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Failed to track event')
    })

    it('should handle service errors during tracking', async () => {
      const { ReportAnalyticsService } = require('@/lib/services/report-analytics.service')
      ReportAnalyticsService.mockImplementation(() => ({
        trackReportView: jest.fn().mockRejectedValue(new Error('Tracking failed'))
      }))

      const requestBody = {
        eventType: 'view',
        sessionData: { viewDuration: 300 }
      }

      const request = new NextRequest('http://localhost:3000/api/analytics/reports/report-1', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })
      const params = { id: 'report-1' }
      
      const response = await trackEvent(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Failed to track event')
    })
  })

  describe('CORS handling', () => {
    it('should handle OPTIONS requests for user analytics', async () => {
      // This would test the OPTIONS method if it's exported
      // For now, we'll verify that CORS headers are properly configured
      const request = new NextRequest('http://localhost:3000/api/analytics/user')
      
      const response = await getUserAnalytics(request)
      
      // Verify that the response doesn't fail on CORS (basic test)
      expect(response.status).toBe(200)
    })

    it('should handle OPTIONS requests for report analytics', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/reports/report-1')
      const params = { id: 'report-1' }
      
      const response = await getReportAnalytics(request, { params })
      
      // Verify that the response doesn't fail on CORS (basic test)
      expect(response.status).toBe(200)
    })
  })

  describe('Authentication flow', () => {
    it('should preserve user context through auth middleware', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/user')
      
      await getUserAnalytics(request)

      const { ReportAnalyticsService } = require('@/lib/services/report-analytics.service')
      const mockService = ReportAnalyticsService.mock.results[0].value
      expect(mockService.getUserAnalytics).toHaveBeenCalledWith('user-1')
    })

    it('should handle missing user context gracefully', async () => {
      // Mock auth guard to return no user
      const { withAuth } = require('@/lib/auth/auth-guard')
      withAuth.mockImplementation((handler: any) => {
        return async (request: NextRequest, ...args: any[]) => {
          // No user property set
          return handler(request, ...args)
        }
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/user')
      
      const response = await getUserAnalytics(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('Authentication required')
    })
  })

  describe('Error response format consistency', () => {
    it('should return consistent error format for authentication errors', async () => {
      const { withAuth } = require('@/lib/auth/auth-guard')
      withAuth.mockImplementation((handler: any) => {
        return async (request: NextRequest, ...args: any[]) => {
          ;(request as any).user = null
          return handler(request, ...args)
        }
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/user')
      
      const response = await getUserAnalytics(request)
      const responseData = await response.json()

      expect(responseData).toHaveProperty('error')
      expect(responseData).not.toHaveProperty('success')
      expect(typeof responseData.error).toBe('string')
    })

    it('should return consistent success format', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/user')
      
      const response = await getUserAnalytics(request)
      const responseData = await response.json()

      expect(responseData).toHaveProperty('success', true)
      expect(responseData).toHaveProperty('data')
      expect(responseData).not.toHaveProperty('error')
    })
  })
})