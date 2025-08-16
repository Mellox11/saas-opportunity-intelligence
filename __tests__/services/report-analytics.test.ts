import { ReportAnalyticsService } from '@/lib/services/report-analytics.service'
import { PrismaClient } from '@prisma/client'

/**
 * Tests for Report Analytics Service
 * AC: 10 - Comprehensive testing for analytics tracking and reporting
 */

// Mock Prisma client
jest.mock('@prisma/client')
jest.mock('@/lib/observability/logger')

describe('ReportAnalyticsService', () => {
  let service: ReportAnalyticsService
  let mockPrisma: jest.Mocked<PrismaClient>

  beforeEach(() => {
    service = new ReportAnalyticsService()
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>
    
    // Mock the prisma property
    ;(service as any).prisma = mockPrisma
    
    // Mock Prisma methods
    mockPrisma.reportAnalytics = {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      upsert: jest.fn()
    } as any
    
    mockPrisma.report = {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    } as any

    jest.clearAllMocks()
  })

  describe('trackReportGeneration', () => {
    it('should track report generation successfully', async () => {
      const mockCreate = mockPrisma.reportAnalytics.create as jest.Mock
      mockCreate.mockResolvedValue({ id: 'analytics-1' })

      await service.trackReportGeneration('report-1', 'user-1', {
        generationTime: 5000,
        cost: 2.50,
        success: true,
        opportunityCount: 3
      })

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          reportId: 'report-1',
          userId: 'user-1',
          eventType: 'generation',
          eventData: {
            generationTime: 5000,
            cost: 2.50,
            success: true,
            opportunityCount: 3
          },
          timestamp: expect.any(Date)
        }
      })
    })

    it('should handle generation tracking errors gracefully', async () => {
      const mockCreate = mockPrisma.reportAnalytics.create as jest.Mock
      mockCreate.mockRejectedValue(new Error('Database error'))

      await expect(
        service.trackReportGeneration('report-1', 'user-1', {
          generationTime: 5000,
          cost: 2.50,
          success: false
        })
      ).rejects.toThrow('Database error')
    })
  })

  describe('trackReportView', () => {
    it('should track report view with session data', async () => {
      const mockCreate = mockPrisma.reportAnalytics.create as jest.Mock
      mockCreate.mockResolvedValue({ id: 'analytics-2' })

      const sessionData = {
        viewDuration: 300,
        deviceType: 'desktop',
        userAgent: 'Mozilla/5.0',
        referrer: 'https://example.com'
      }

      await service.trackReportView('report-1', 'user-1', sessionData)

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          reportId: 'report-1',
          userId: 'user-1',
          eventType: 'view',
          eventData: sessionData,
          timestamp: expect.any(Date)
        }
      })
    })

    it('should track view without session data', async () => {
      const mockCreate = mockPrisma.reportAnalytics.create as jest.Mock
      mockCreate.mockResolvedValue({ id: 'analytics-3' })

      await service.trackReportView('report-1', 'user-1')

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          reportId: 'report-1',
          userId: 'user-1',
          eventType: 'view',
          eventData: {},
          timestamp: expect.any(Date)
        }
      })
    })
  })

  describe('trackReportShare', () => {
    it('should track report share event', async () => {
      const mockCreate = mockPrisma.reportAnalytics.create as jest.Mock
      mockCreate.mockResolvedValue({ id: 'analytics-4' })

      const shareData = {
        shareId: 'share-123',
        shareType: 'public',
        expiresAt: new Date('2024-12-31'),
        passwordProtected: false
      }

      await service.trackReportShare('report-1', 'user-1', shareData)

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          reportId: 'report-1',
          userId: 'user-1',
          eventType: 'share_created',
          eventData: shareData,
          timestamp: expect.any(Date)
        }
      })
    })
  })

  describe('trackPDFExport', () => {
    it('should track PDF export with complete data', async () => {
      const mockCreate = mockPrisma.reportAnalytics.create as jest.Mock
      mockCreate.mockResolvedValue({ id: 'analytics-5' })

      const exportData = {
        format: 'pdf',
        type: 'full',
        exportTime: 3000,
        fileSize: 2048576,
        success: true
      }

      await service.trackPDFExport('report-1', 'user-1', exportData)

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          reportId: 'report-1',
          userId: 'user-1',
          eventType: 'export',
          eventData: exportData,
          timestamp: expect.any(Date)
        }
      })
    })

    it('should track failed PDF export', async () => {
      const mockCreate = mockPrisma.reportAnalytics.create as jest.Mock
      mockCreate.mockResolvedValue({ id: 'analytics-6' })

      const exportData = {
        format: 'pdf',
        type: 'summary',
        exportTime: 0,
        fileSize: 0,
        success: false,
        error: 'Generation timeout'
      }

      await service.trackPDFExport('report-1', 'user-1', exportData)

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          reportId: 'report-1',
          userId: 'user-1',
          eventType: 'export',
          eventData: exportData,
          timestamp: expect.any(Date)
        }
      })
    })
  })

  describe('getReportAnalytics', () => {
    it('should return comprehensive report analytics', async () => {
      const mockReport = { id: 'report-1', userId: 'user-1' }
      const mockAnalytics = [
        {
          eventType: 'view',
          eventData: { deviceType: 'desktop', viewDuration: 300 },
          timestamp: new Date('2024-01-15T10:00:00Z')
        },
        {
          eventType: 'export',
          eventData: { format: 'pdf', type: 'full', exportTime: 2000, success: true },
          timestamp: new Date('2024-01-15T11:00:00Z')
        },
        {
          eventType: 'share_created',
          eventData: { shareType: 'public' },
          timestamp: new Date('2024-01-15T12:00:00Z')
        }
      ]

      mockPrisma.report.findUnique = jest.fn().mockResolvedValue(mockReport)
      mockPrisma.reportAnalytics.findMany = jest.fn().mockResolvedValue(mockAnalytics)

      const result = await service.getReportAnalytics('report-1', 'user-1')

      expect(result).toMatchObject({
        reportId: 'report-1',
        totalViews: 1,
        uniqueViews: 1,
        totalShares: 1,
        totalDownloads: 1
      })

      expect(result.performanceMetrics).toBeDefined()
      expect(result.usagePatterns).toBeDefined()
      expect(result.shareAnalytics).toBeDefined()
      expect(result.exportAnalytics).toBeDefined()
    })

    it('should handle non-existent report', async () => {
      mockPrisma.report.findUnique = jest.fn().mockResolvedValue(null)

      await expect(
        service.getReportAnalytics('non-existent', 'user-1')
      ).rejects.toThrow('Report not found or access denied')
    })

    it('should handle access denied for other user reports', async () => {
      const mockReport = { id: 'report-1', userId: 'other-user' }
      mockPrisma.report.findUnique = jest.fn().mockResolvedValue(mockReport)

      await expect(
        service.getReportAnalytics('report-1', 'user-1')
      ).rejects.toThrow('Report not found or access denied')
    })
  })

  describe('getUserAnalytics', () => {
    it('should return comprehensive user analytics', async () => {
      const mockReports = [
        { id: 'report-1', createdAt: new Date('2024-01-15') },
        { id: 'report-2', createdAt: new Date('2024-01-16') }
      ]

      const mockAnalytics = [
        {
          reportId: 'report-1',
          eventType: 'generation',
          eventData: { cost: 2.50, generationTime: 5000 },
          timestamp: new Date('2024-01-15T10:00:00Z')
        },
        {
          reportId: 'report-1',
          eventType: 'view',
          eventData: { viewDuration: 300 },
          timestamp: new Date('2024-01-15T11:00:00Z')
        },
        {
          reportId: 'report-2',
          eventType: 'generation',
          eventData: { cost: 3.00, generationTime: 6000 },
          timestamp: new Date('2024-01-16T10:00:00Z')
        }
      ]

      mockPrisma.report.findMany = jest.fn().mockResolvedValue(mockReports)
      mockPrisma.reportAnalytics.findMany = jest.fn().mockResolvedValue(mockAnalytics)

      const result = await service.getUserAnalytics('user-1')

      expect(result).toMatchObject({
        userId: 'user-1',
        totalReports: 2,
        totalViews: 1,
        totalShares: 0,
        totalCosts: 5.50
      })

      expect(result.recentActivity).toBeDefined()
      expect(result.recentActivity).toHaveLength(3)
      expect(result.performanceMetrics).toBeDefined()
    })

    it('should handle user with no reports', async () => {
      mockPrisma.report.findMany = jest.fn().mockResolvedValue([])
      mockPrisma.reportAnalytics.findMany = jest.fn().mockResolvedValue([])

      const result = await service.getUserAnalytics('user-1')

      expect(result).toMatchObject({
        userId: 'user-1',
        totalReports: 0,
        totalViews: 0,
        totalShares: 0,
        totalCosts: 0
      })

      expect(result.recentActivity).toEqual([])
    })
  })

  describe('Performance metrics calculation', () => {
    it('should calculate performance metrics correctly', async () => {
      const mockReport = { id: 'report-1', userId: 'user-1' }
      const mockAnalytics = [
        {
          eventType: 'generation',
          eventData: { generationTime: 5000, cost: 2.50, success: true },
          timestamp: new Date()
        },
        {
          eventType: 'generation',
          eventData: { generationTime: 7000, cost: 3.00, success: true },
          timestamp: new Date()
        },
        {
          eventType: 'export',
          eventData: { exportTime: 2000, success: true },
          timestamp: new Date()
        },
        {
          eventType: 'export',
          eventData: { exportTime: 0, success: false },
          timestamp: new Date()
        }
      ]

      mockPrisma.report.findUnique = jest.fn().mockResolvedValue(mockReport)
      mockPrisma.reportAnalytics.findMany = jest.fn().mockResolvedValue(mockAnalytics)

      const result = await service.getReportAnalytics('report-1', 'user-1')

      expect(result.performanceMetrics).toMatchObject({
        averageGenerationTime: 6000, // (5000 + 7000) / 2
        averageCost: 2.75, // (2.50 + 3.00) / 2
        successRate: 75, // 3 successful out of 4 total events
        errorCount: 1
      })
    })
  })

  describe('Usage patterns analysis', () => {
    it('should analyze device types correctly', async () => {
      const mockReport = { id: 'report-1', userId: 'user-1' }
      const mockAnalytics = [
        {
          eventType: 'view',
          eventData: { deviceType: 'desktop' },
          timestamp: new Date()
        },
        {
          eventType: 'view',
          eventData: { deviceType: 'desktop' },
          timestamp: new Date()
        },
        {
          eventType: 'view',
          eventData: { deviceType: 'mobile' },
          timestamp: new Date()
        }
      ]

      mockPrisma.report.findUnique = jest.fn().mockResolvedValue(mockReport)
      mockPrisma.reportAnalytics.findMany = jest.fn().mockResolvedValue(mockAnalytics)

      const result = await service.getReportAnalytics('report-1', 'user-1')

      expect(result.usagePatterns.deviceTypes).toEqual([
        { type: 'desktop', count: 2 },
        { type: 'mobile', count: 1 }
      ])
    })

    it('should analyze views by hour correctly', async () => {
      const mockReport = { id: 'report-1', userId: 'user-1' }
      const mockAnalytics = [
        {
          eventType: 'view',
          eventData: {},
          timestamp: new Date('2024-01-15T10:30:00Z') // Hour 10
        },
        {
          eventType: 'view',
          eventData: {},
          timestamp: new Date('2024-01-15T10:45:00Z') // Hour 10
        },
        {
          eventType: 'view',
          eventData: {},
          timestamp: new Date('2024-01-15T14:15:00Z') // Hour 14
        }
      ]

      mockPrisma.report.findUnique = jest.fn().mockResolvedValue(mockReport)
      mockPrisma.reportAnalytics.findMany = jest.fn().mockResolvedValue(mockAnalytics)

      const result = await service.getReportAnalytics('report-1', 'user-1')

      const hour10 = result.usagePatterns.viewsByHour.find(h => h.hour === 10)
      const hour14 = result.usagePatterns.viewsByHour.find(h => h.hour === 14)

      expect(hour10?.views).toBe(2)
      expect(hour14?.views).toBe(1)
    })
  })

  describe('Share analytics calculation', () => {
    it('should calculate share metrics correctly', async () => {
      const mockReport = { id: 'report-1', userId: 'user-1' }
      const mockAnalytics = [
        {
          eventType: 'share_created',
          eventData: { shareType: 'public' },
          timestamp: new Date()
        },
        {
          eventType: 'share_accessed',
          eventData: { referrer: 'direct' },
          timestamp: new Date()
        },
        {
          eventType: 'share_accessed',
          eventData: { referrer: 'email' },
          timestamp: new Date()
        },
        {
          eventType: 'view',
          eventData: {},
          timestamp: new Date()
        }
      ]

      mockPrisma.report.findUnique = jest.fn().mockResolvedValue(mockReport)
      mockPrisma.reportAnalytics.findMany = jest.fn().mockResolvedValue(mockAnalytics)

      const result = await service.getReportAnalytics('report-1', 'user-1')

      expect(result.shareAnalytics).toMatchObject({
        totalShareLinks: 1,
        activeShareLinks: 1,
        totalShareViews: 2,
        shareConversionRate: 50 // 2 share views out of 4 total events
      })

      expect(result.shareAnalytics.topReferrers).toEqual([
        { source: 'direct', count: 1 },
        { source: 'email', count: 1 }
      ])
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle database connection errors', async () => {
      mockPrisma.reportAnalytics.create = jest.fn().mockRejectedValue(new Error('Connection failed'))

      await expect(
        service.trackReportView('report-1', 'user-1')
      ).rejects.toThrow('Connection failed')
    })

    it('should handle malformed event data gracefully', async () => {
      const mockCreate = mockPrisma.reportAnalytics.create as jest.Mock
      mockCreate.mockResolvedValue({ id: 'analytics-1' })

      // Test with undefined event data
      await service.trackReportView('report-1', 'user-1', undefined)

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          reportId: 'report-1',
          userId: 'user-1',
          eventType: 'view',
          eventData: {},
          timestamp: expect.any(Date)
        }
      })
    })

    it('should handle analytics queries with no data', async () => {
      const mockReport = { id: 'report-1', userId: 'user-1' }
      mockPrisma.report.findUnique = jest.fn().mockResolvedValue(mockReport)
      mockPrisma.reportAnalytics.findMany = jest.fn().mockResolvedValue([])

      const result = await service.getReportAnalytics('report-1', 'user-1')

      expect(result).toMatchObject({
        reportId: 'report-1',
        totalViews: 0,
        uniqueViews: 0,
        totalShares: 0,
        totalDownloads: 0
      })
    })
  })
})