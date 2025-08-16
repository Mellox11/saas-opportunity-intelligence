import { ReportSharingService } from '@/lib/services/report-sharing.service'
import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

/**
 * Tests for Report Sharing Service
 * AC: 8 - Comprehensive testing for report sharing and privacy system
 */

// Mock dependencies
jest.mock('@prisma/client')
jest.mock('@/lib/observability/logger')
jest.mock('crypto', () => ({
  randomBytes: jest.fn()
}))

describe('ReportSharingService', () => {
  let service: ReportSharingService
  let mockPrisma: jest.Mocked<PrismaClient>
  const mockRandomBytes = randomBytes as jest.MockedFunction<typeof randomBytes>

  beforeEach(() => {
    service = new ReportSharingService()
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>
    
    // Mock the prisma property
    ;(service as any).prisma = mockPrisma
    
    // Mock Prisma methods
    mockPrisma.reportShare = {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    } as any
    
    mockPrisma.report = {
      findUnique: jest.fn(),
      findFirst: jest.fn()
    } as any

    // Mock crypto.randomBytes
    mockRandomBytes.mockReturnValue(Buffer.from('mockedrandomdata'))

    jest.clearAllMocks()
  })

  describe('createShareLink', () => {
    const mockReport = {
      id: 'report-1',
      userId: 'user-1',
      privacy: {
        isPublic: false,
        allowSharing: true
      }
    }

    it('should create public share link successfully', async () => {
      mockPrisma.report.findUnique = jest.fn().mockResolvedValue(mockReport)
      mockPrisma.reportShare.create = jest.fn().mockResolvedValue({
        id: 'share-1',
        shareId: 'mock-share-id',
        reportId: 'report-1',
        createdBy: 'user-1',
        shareType: 'public',
        isActive: true,
        accessCount: 0,
        createdAt: new Date()
      })

      const result = await service.createShareLink('report-1', 'user-1', {
        shareType: 'public',
        allowDownload: true,
        expiresAt: null,
        password: null
      })

      expect(result).toMatchObject({
        shareId: 'mock-share-id',
        shareUrl: expect.stringContaining('/share/mock-share-id'),
        shareType: 'public',
        isActive: true,
        allowDownload: true
      })

      expect(mockPrisma.reportShare.create).toHaveBeenCalledWith({
        data: {
          shareId: expect.any(String),
          reportId: 'report-1',
          createdBy: 'user-1',
          shareType: 'public',
          allowDownload: true,
          isActive: true,
          accessCount: 0,
          expiresAt: null,
          passwordHash: null
        }
      })
    })

    it('should create password-protected share link', async () => {
      mockPrisma.report.findUnique = jest.fn().mockResolvedValue(mockReport)
      mockPrisma.reportShare.create = jest.fn().mockResolvedValue({
        id: 'share-2',
        shareId: 'protected-share-id',
        reportId: 'report-1',
        createdBy: 'user-1',
        shareType: 'password_protected',
        isActive: true,
        accessCount: 0,
        createdAt: new Date()
      })

      const result = await service.createShareLink('report-1', 'user-1', {
        shareType: 'password_protected',
        allowDownload: false,
        expiresAt: new Date('2024-12-31'),
        password: 'secure123'
      })

      expect(result.shareType).toBe('password_protected')
      expect(result.allowDownload).toBe(false)
      expect(result.expiresAt).toEqual(new Date('2024-12-31'))

      expect(mockPrisma.reportShare.create).toHaveBeenCalledWith({
        data: {
          shareId: expect.any(String),
          reportId: 'report-1',
          createdBy: 'user-1',
          shareType: 'password_protected',
          allowDownload: false,
          isActive: true,
          accessCount: 0,
          expiresAt: new Date('2024-12-31'),
          passwordHash: expect.any(String)
        }
      })
    })

    it('should reject sharing when report does not allow sharing', async () => {
      const restrictedReport = {
        ...mockReport,
        privacy: {
          isPublic: false,
          allowSharing: false
        }
      }

      mockPrisma.report.findUnique = jest.fn().mockResolvedValue(restrictedReport)

      await expect(
        service.createShareLink('report-1', 'user-1', {
          shareType: 'public',
          allowDownload: true,
          expiresAt: null,
          password: null
        })
      ).rejects.toThrow('Report sharing is not allowed')
    })

    it('should reject sharing for non-existent report', async () => {
      mockPrisma.report.findUnique = jest.fn().mockResolvedValue(null)

      await expect(
        service.createShareLink('non-existent', 'user-1', {
          shareType: 'public',
          allowDownload: true,
          expiresAt: null,
          password: null
        })
      ).rejects.toThrow('Report not found or access denied')
    })

    it('should reject sharing for reports owned by other users', async () => {
      const otherUserReport = {
        ...mockReport,
        userId: 'other-user'
      }

      mockPrisma.report.findUnique = jest.fn().mockResolvedValue(otherUserReport)

      await expect(
        service.createShareLink('report-1', 'user-1', {
          shareType: 'public',
          allowDownload: true,
          expiresAt: null,
          password: null
        })
      ).rejects.toThrow('Report not found or access denied')
    })
  })

  describe('getSharedReport', () => {
    const mockShareLink = {
      id: 'share-1',
      shareId: 'mock-share-id',
      reportId: 'report-1',
      shareType: 'public',
      isActive: true,
      allowDownload: true,
      expiresAt: null,
      passwordHash: null,
      accessCount: 5,
      report: {
        id: 'report-1',
        reportType: 'standard',
        executiveSummary: { totalOpportunities: 3 },
        opportunities: [],
        marketAnalysis: {},
        metadata: {},
        privacy: { isPublic: true }
      }
    }

    it('should retrieve public shared report successfully', async () => {
      mockPrisma.reportShare.findUnique = jest.fn().mockResolvedValue(mockShareLink)
      mockPrisma.reportShare.update = jest.fn().mockResolvedValue(mockShareLink)

      const result = await service.getSharedReport('mock-share-id')

      expect(result).toMatchObject({
        report: {
          id: 'report-1',
          reportType: 'standard'
        },
        shareInfo: {
          shareType: 'public',
          allowDownload: true,
          accessCount: 6 // Incremented
        }
      })

      // Verify access count was incremented
      expect(mockPrisma.reportShare.update).toHaveBeenCalledWith({
        where: { shareId: 'mock-share-id' },
        data: { accessCount: { increment: 1 } }
      })
    })

    it('should validate password for protected shares', async () => {
      const protectedShareLink = {
        ...mockShareLink,
        shareType: 'password_protected',
        passwordHash: '$2b$10$hashedpassword'
      }

      mockPrisma.reportShare.findUnique = jest.fn().mockResolvedValue(protectedShareLink)

      const result = await service.getSharedReport('mock-share-id', 'correct-password')

      expect(result.shareInfo.shareType).toBe('password_protected')
    })

    it('should reject invalid password for protected shares', async () => {
      const protectedShareLink = {
        ...mockShareLink,
        shareType: 'password_protected',
        passwordHash: '$2b$10$hashedpassword'
      }

      mockPrisma.reportShare.findUnique = jest.fn().mockResolvedValue(protectedShareLink)

      await expect(
        service.getSharedReport('mock-share-id', 'wrong-password')
      ).rejects.toThrow('Invalid password')
    })

    it('should reject access to expired share links', async () => {
      const expiredShareLink = {
        ...mockShareLink,
        expiresAt: new Date('2023-01-01') // Past date
      }

      mockPrisma.reportShare.findUnique = jest.fn().mockResolvedValue(expiredShareLink)

      await expect(
        service.getSharedReport('mock-share-id')
      ).rejects.toThrow('Share link has expired')
    })

    it('should reject access to inactive share links', async () => {
      const inactiveShareLink = {
        ...mockShareLink,
        isActive: false
      }

      mockPrisma.reportShare.findUnique = jest.fn().mockResolvedValue(inactiveShareLink)

      await expect(
        service.getSharedReport('mock-share-id')
      ).rejects.toThrow('Share link is no longer active')
    })

    it('should reject access to non-existent share links', async () => {
      mockPrisma.reportShare.findUnique = jest.fn().mockResolvedValue(null)

      await expect(
        service.getSharedReport('non-existent')
      ).rejects.toThrow('Share link not found')
    })
  })

  describe('updateShareLink', () => {
    const mockShareLink = {
      id: 'share-1',
      shareId: 'mock-share-id',
      reportId: 'report-1',
      createdBy: 'user-1',
      shareType: 'public',
      isActive: true,
      allowDownload: true,
      expiresAt: null,
      passwordHash: null
    }

    it('should update share link successfully', async () => {
      mockPrisma.reportShare.findUnique = jest.fn().mockResolvedValue(mockShareLink)
      mockPrisma.reportShare.update = jest.fn().mockResolvedValue({
        ...mockShareLink,
        shareType: 'password_protected',
        allowDownload: false,
        expiresAt: new Date('2024-12-31')
      })

      const result = await service.updateShareLink('mock-share-id', 'user-1', {
        shareType: 'password_protected',
        allowDownload: false,
        expiresAt: new Date('2024-12-31'),
        password: 'newpassword123'
      })

      expect(result.shareType).toBe('password_protected')
      expect(result.allowDownload).toBe(false)
      expect(result.expiresAt).toEqual(new Date('2024-12-31'))

      expect(mockPrisma.reportShare.update).toHaveBeenCalledWith({
        where: { shareId: 'mock-share-id' },
        data: {
          shareType: 'password_protected',
          allowDownload: false,
          expiresAt: new Date('2024-12-31'),
          passwordHash: expect.any(String)
        }
      })
    })

    it('should deactivate share link', async () => {
      mockPrisma.reportShare.findUnique = jest.fn().mockResolvedValue(mockShareLink)
      mockPrisma.reportShare.update = jest.fn().mockResolvedValue({
        ...mockShareLink,
        isActive: false
      })

      const result = await service.updateShareLink('mock-share-id', 'user-1', {
        isActive: false
      })

      expect(result.isActive).toBe(false)
    })

    it('should reject updates from non-owners', async () => {
      mockPrisma.reportShare.findUnique = jest.fn().mockResolvedValue(mockShareLink)

      await expect(
        service.updateShareLink('mock-share-id', 'other-user', {
          allowDownload: false
        })
      ).rejects.toThrow('Access denied')
    })
  })

  describe('deleteShareLink', () => {
    const mockShareLink = {
      id: 'share-1',
      shareId: 'mock-share-id',
      reportId: 'report-1',
      createdBy: 'user-1'
    }

    it('should delete share link successfully', async () => {
      mockPrisma.reportShare.findUnique = jest.fn().mockResolvedValue(mockShareLink)
      mockPrisma.reportShare.delete = jest.fn().mockResolvedValue(mockShareLink)

      await service.deleteShareLink('mock-share-id', 'user-1')

      expect(mockPrisma.reportShare.delete).toHaveBeenCalledWith({
        where: { shareId: 'mock-share-id' }
      })
    })

    it('should reject deletion from non-owners', async () => {
      mockPrisma.reportShare.findUnique = jest.fn().mockResolvedValue(mockShareLink)

      await expect(
        service.deleteShareLink('mock-share-id', 'other-user')
      ).rejects.toThrow('Access denied')
    })

    it('should handle deletion of non-existent share link', async () => {
      mockPrisma.reportShare.findUnique = jest.fn().mockResolvedValue(null)

      await expect(
        service.deleteShareLink('non-existent', 'user-1')
      ).rejects.toThrow('Share link not found')
    })
  })

  describe('getUserShareLinks', () => {
    it('should retrieve user share links with report info', async () => {
      const mockShareLinks = [
        {
          id: 'share-1',
          shareId: 'share-id-1',
          shareType: 'public',
          isActive: true,
          allowDownload: true,
          accessCount: 10,
          createdAt: new Date('2024-01-15'),
          expiresAt: null,
          report: {
            id: 'report-1',
            reportType: 'standard',
            metadata: {
              generatedAt: new Date('2024-01-15')
            }
          }
        },
        {
          id: 'share-2',
          shareId: 'share-id-2',
          shareType: 'password_protected',
          isActive: false,
          allowDownload: false,
          accessCount: 3,
          createdAt: new Date('2024-01-16'),
          expiresAt: new Date('2024-12-31'),
          report: {
            id: 'report-2',
            reportType: 'summary',
            metadata: {
              generatedAt: new Date('2024-01-16')
            }
          }
        }
      ]

      mockPrisma.reportShare.findMany = jest.fn().mockResolvedValue(mockShareLinks)

      const result = await service.getUserShareLinks('user-1')

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        shareId: 'share-id-1',
        shareType: 'public',
        isActive: true,
        accessCount: 10,
        reportInfo: {
          id: 'report-1',
          reportType: 'standard'
        }
      })

      expect(mockPrisma.reportShare.findMany).toHaveBeenCalledWith({
        where: { createdBy: 'user-1' },
        include: { report: true },
        orderBy: { createdAt: 'desc' }
      })
    })

    it('should return empty array for user with no shares', async () => {
      mockPrisma.reportShare.findMany = jest.fn().mockResolvedValue([])

      const result = await service.getUserShareLinks('user-1')

      expect(result).toEqual([])
    })
  })

  describe('validateShareAccess', () => {
    it('should validate active public share', async () => {
      const publicShare = {
        shareType: 'public',
        isActive: true,
        expiresAt: null,
        passwordHash: null
      }

      const result = await service.validateShareAccess(publicShare as any)

      expect(result.isValid).toBe(true)
      expect(result.requiresPassword).toBe(false)
    })

    it('should validate password-protected share', async () => {
      const protectedShare = {
        shareType: 'password_protected',
        isActive: true,
        expiresAt: null,
        passwordHash: '$2b$10$hashedpassword'
      }

      const result = await service.validateShareAccess(protectedShare as any)

      expect(result.isValid).toBe(true)
      expect(result.requiresPassword).toBe(true)
    })

    it('should reject inactive share', async () => {
      const inactiveShare = {
        shareType: 'public',
        isActive: false,
        expiresAt: null,
        passwordHash: null
      }

      const result = await service.validateShareAccess(inactiveShare as any)

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Share link is no longer active')
    })

    it('should reject expired share', async () => {
      const expiredShare = {
        shareType: 'public',
        isActive: true,
        expiresAt: new Date('2023-01-01'),
        passwordHash: null
      }

      const result = await service.validateShareAccess(expiredShare as any)

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Share link has expired')
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.reportShare.create = jest.fn().mockRejectedValue(new Error('Database error'))
      mockPrisma.report.findUnique = jest.fn().mockResolvedValue({
        id: 'report-1',
        userId: 'user-1',
        privacy: { allowSharing: true }
      })

      await expect(
        service.createShareLink('report-1', 'user-1', {
          shareType: 'public',
          allowDownload: true,
          expiresAt: null,
          password: null
        })
      ).rejects.toThrow('Database error')
    })

    it('should handle invalid share IDs', async () => {
      mockPrisma.reportShare.findUnique = jest.fn().mockResolvedValue(null)

      await expect(
        service.getSharedReport('invalid-share-id')
      ).rejects.toThrow('Share link not found')
    })

    it('should handle password comparison errors', async () => {
      const protectedShareLink = {
        shareType: 'password_protected',
        passwordHash: 'invalid-hash',
        isActive: true,
        expiresAt: null,
        report: { id: 'report-1' }
      }

      mockPrisma.reportShare.findUnique = jest.fn().mockResolvedValue(protectedShareLink)

      await expect(
        service.getSharedReport('mock-share-id', 'any-password')
      ).rejects.toThrow('Invalid password')
    })
  })
})