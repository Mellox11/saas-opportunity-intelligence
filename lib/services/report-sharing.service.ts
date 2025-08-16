import { randomBytes, createHash } from 'crypto'
import { prisma } from '@/lib/db'
import { AppLogger } from '@/lib/observability/logger'
import { CostTrackingService } from '@/lib/services/cost-tracking.service'

/**
 * Report Sharing Service for Privacy and Access Control
 * AC: 8 - Report sharing with privacy controls, expiration dates, and password protection
 */

export interface ShareLinkOptions {
  reportId: string
  userId: string
  expiresAt?: Date
  password?: string
  allowDownload?: boolean
  allowPrint?: boolean
  recipientEmail?: string
  shareNote?: string
}

export interface ShareLinkResponse {
  shareToken: string
  shareUrl: string
  expiresAt: Date | null
  passwordProtected: boolean
  permissions: {
    allowDownload: boolean
    allowPrint: boolean
  }
}

export interface PublicReportAccess {
  reportId: string
  title: string
  summary: string
  opportunities: Array<{
    id: string
    title: string
    score: number
    category: string
  }>
  isLimited: boolean
  generatedAt: Date
}

export class ReportSharingService {
  private costTrackingService: CostTrackingService | null

  constructor(skipCostTracking: boolean = false) {
    this.costTrackingService = skipCostTracking ? null : new CostTrackingService()
  }

  /**
   * Create a secure share link for a report
   */
  async createShareLink(options: ShareLinkOptions): Promise<ShareLinkResponse> {
    try {
      AppLogger.info('Creating report share link', {
        service: 'report-sharing',
        operation: 'create_share_link',
        metadata: {
          reportId: options.reportId,
          userId: options.userId,
          hasPassword: !!options.password,
          hasExpiration: !!options.expiresAt,
          recipientEmail: options.recipientEmail
        }
      })

      // Verify report exists and user has access
      const report = await prisma.report.findFirst({
        where: {
          id: options.reportId,
          userId: options.userId
        }
      })

      if (!report) {
        throw new Error('Report not found or access denied')
      }

      // Generate secure share token
      const shareToken = this.generateShareToken()
      
      // Hash password if provided
      const passwordHash = options.password ? 
        createHash('sha256').update(options.password).digest('hex') : null

      // Create share record
      const shareRecord = await prisma.reportShare.create({
        data: {
          reportId: options.reportId,
          shareToken,
          createdByUserId: options.userId,
          expiresAt: options.expiresAt || null,
          passwordHash,
          allowDownload: options.allowDownload ?? true,
          allowPrint: options.allowPrint ?? true,
          recipientEmail: options.recipientEmail || null,
          shareNote: options.shareNote || null,
          accessCount: 0,
          isActive: true
        }
      })

      // Generate public share URL
      const shareUrl = this.generateShareUrl(shareToken)

      // Track sharing event
      await this.trackSharingEvent(options.reportId, 'share_created', {
        shareToken,
        passwordProtected: !!options.password,
        hasExpiration: !!options.expiresAt
      })

      AppLogger.info('Share link created successfully', {
        service: 'report-sharing',
        operation: 'create_share_link_completed',
        metadata: {
          reportId: options.reportId,
          shareToken,
          expiresAt: options.expiresAt
        }
      })

      return {
        shareToken,
        shareUrl,
        expiresAt: options.expiresAt || null,
        passwordProtected: !!options.password,
        permissions: {
          allowDownload: options.allowDownload ?? true,
          allowPrint: options.allowPrint ?? true
        }
      }

    } catch (error) {
      AppLogger.error('Failed to create share link', {
        service: 'report-sharing',
        operation: 'create_share_link_error',
        metadata: {
          reportId: options.reportId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      throw error
    }
  }

  /**
   * Access a shared report via share token
   */
  async accessSharedReport(
    shareToken: string,
    password?: string,
    requestInfo?: {
      userAgent?: string
      ipAddress?: string
      referrer?: string
    }
  ): Promise<PublicReportAccess> {
    try {
      AppLogger.info('Accessing shared report', {
        service: 'report-sharing',
        operation: 'access_shared_report',
        metadata: {
          shareToken,
          hasPassword: !!password,
          userAgent: requestInfo?.userAgent,
          ipAddress: requestInfo?.ipAddress
        }
      })

      // Find share record
      const shareRecord = await prisma.reportShare.findUnique({
        where: { shareToken },
        include: {
          report: {
            include: {
              analysis: {
                include: {
                  opportunities: {
                    select: {
                      id: true,
                      title: true,
                      opportunityScore: true,
                      classification: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (!shareRecord || !shareRecord.isActive) {
        throw new Error('Share link not found or has been disabled')
      }

      // Check expiration
      if (shareRecord.expiresAt && shareRecord.expiresAt < new Date()) {
        await this.deactivateShareLink(shareToken, 'expired')
        throw new Error('Share link has expired')
      }

      // Check password if required
      if (shareRecord.passwordHash) {
        if (!password) {
          throw new Error('Password required for this shared report')
        }
        
        const passwordHash = createHash('sha256').update(password).digest('hex')
        if (passwordHash !== shareRecord.passwordHash) {
          await this.trackSharingEvent(shareRecord.reportId, 'access_denied', {
            shareToken,
            reason: 'invalid_password'
          })
          throw new Error('Invalid password')
        }
      }

      // Increment access count
      await prisma.reportShare.update({
        where: { shareToken },
        data: {
          accessCount: { increment: 1 },
          lastAccessedAt: new Date()
        }
      })

      // Parse report data
      const executiveSummary = typeof shareRecord.report.executiveSummary === 'string' 
        ? JSON.parse(shareRecord.report.executiveSummary)
        : shareRecord.report.executiveSummary

      const enhancedOpportunities = typeof shareRecord.report.enhancedOpportunities === 'string'
        ? JSON.parse(shareRecord.report.enhancedOpportunities)
        : shareRecord.report.enhancedOpportunities

      // Create public access object (limited information)
      const publicAccess: PublicReportAccess = {
        reportId: shareRecord.report.id,
        title: `SaaS Opportunity Analysis Report`,
        summary: executiveSummary?.keyFindings?.slice(0, 2)?.join('. ') || 'Analysis of SaaS business opportunities',
        opportunities: enhancedOpportunities?.slice(0, 10)?.map((opp: any) => ({
          id: opp.id,
          title: opp.title,
          score: opp.opportunityScore,
          category: opp.classification
        })) || [],
        isLimited: true, // Always limit public access
        generatedAt: shareRecord.report.createdAt
      }

      // Track successful access
      await this.trackSharingEvent(shareRecord.reportId, 'access_granted', {
        shareToken,
        accessCount: shareRecord.accessCount + 1,
        requestInfo
      })

      AppLogger.info('Shared report accessed successfully', {
        service: 'report-sharing',
        operation: 'access_shared_report_completed',
        metadata: {
          reportId: shareRecord.report.id,
          shareToken,
          accessCount: shareRecord.accessCount + 1
        }
      })

      return publicAccess

    } catch (error) {
      AppLogger.error('Failed to access shared report', {
        service: 'report-sharing',
        operation: 'access_shared_report_error',
        metadata: {
          shareToken,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      throw error
    }
  }

  /**
   * Get sharing analytics for a report
   */
  async getReportSharingAnalytics(reportId: string, userId: string): Promise<{
    totalShares: number
    activeShares: number
    totalAccesses: number
    recentActivity: Array<{
      event: string
      timestamp: Date
      metadata?: any
    }>
    shareLinks: Array<{
      shareToken: string
      createdAt: Date
      expiresAt: Date | null
      accessCount: number
      lastAccessedAt: Date | null
      isActive: boolean
      passwordProtected: boolean
      recipientEmail: string | null
    }>
  }> {
    try {
      // Verify user owns the report
      const report = await prisma.report.findFirst({
        where: {
          id: reportId,
          userId
        }
      })

      if (!report) {
        throw new Error('Report not found or access denied')
      }

      // Get share links
      const shareLinks = await prisma.reportShare.findMany({
        where: { reportId },
        orderBy: { createdAt: 'desc' }
      })

      // Get analytics data
      const analytics = await prisma.reportAnalytics.findMany({
        where: {
          reportId,
          eventType: { in: ['share_created', 'access_granted', 'access_denied'] }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })

      const totalShares = shareLinks.length
      const activeShares = shareLinks.filter(link => link.isActive).length
      const totalAccesses = shareLinks.reduce((sum, link) => sum + link.accessCount, 0)

      return {
        totalShares,
        activeShares,
        totalAccesses,
        recentActivity: analytics.map(event => ({
          event: event.eventType,
          timestamp: event.createdAt,
          metadata: typeof event.eventData === 'string' ? JSON.parse(event.eventData) : event.eventData
        })),
        shareLinks: shareLinks.map(link => ({
          shareToken: link.shareToken,
          createdAt: link.createdAt,
          expiresAt: link.expiresAt,
          accessCount: link.accessCount,
          lastAccessedAt: link.lastAccessedAt,
          isActive: link.isActive,
          passwordProtected: !!link.passwordHash,
          recipientEmail: link.recipientEmail
        }))
      }

    } catch (error) {
      AppLogger.error('Failed to get sharing analytics', {
        service: 'report-sharing',
        operation: 'get_sharing_analytics_error',
        metadata: {
          reportId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      throw error
    }
  }

  /**
   * Revoke a share link
   */
  async revokeShareLink(shareToken: string, userId: string): Promise<void> {
    try {
      const shareRecord = await prisma.reportShare.findUnique({
        where: { shareToken },
        include: { report: true }
      })

      if (!shareRecord) {
        throw new Error('Share link not found')
      }

      if (shareRecord.report.userId !== userId) {
        throw new Error('Access denied')
      }

      await this.deactivateShareLink(shareToken, 'revoked_by_owner')

      AppLogger.info('Share link revoked', {
        service: 'report-sharing',
        operation: 'revoke_share_link',
        metadata: {
          shareToken,
          reportId: shareRecord.reportId
        }
      })

    } catch (error) {
      AppLogger.error('Failed to revoke share link', {
        service: 'report-sharing',
        operation: 'revoke_share_link_error',
        metadata: {
          shareToken,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      throw error
    }
  }

  /**
   * Update report privacy settings
   */
  async updateReportPrivacy(
    reportId: string,
    userId: string,
    settings: {
      isPublic?: boolean
      allowSharing?: boolean
      requirePassword?: boolean
      defaultExpirationDays?: number
    }
  ): Promise<void> {
    try {
      const report = await prisma.report.findFirst({
        where: {
          id: reportId,
          userId
        }
      })

      if (!report) {
        throw new Error('Report not found or access denied')
      }

      await prisma.report.update({
        where: { id: reportId },
        data: {
          isPublic: settings.isPublic,
          allowSharing: settings.allowSharing,
          requirePassword: settings.requirePassword,
          defaultExpirationDays: settings.defaultExpirationDays
        }
      })

      // If sharing is disabled, deactivate all existing shares
      if (settings.allowSharing === false) {
        await prisma.reportShare.updateMany({
          where: { reportId },
          data: { isActive: false }
        })

        await this.trackSharingEvent(reportId, 'sharing_disabled', {
          updatedBy: userId
        })
      }

      AppLogger.info('Report privacy settings updated', {
        service: 'report-sharing',
        operation: 'update_privacy_settings',
        metadata: {
          reportId,
          settings
        }
      })

    } catch (error) {
      AppLogger.error('Failed to update privacy settings', {
        service: 'report-sharing',
        operation: 'update_privacy_settings_error',
        metadata: {
          reportId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      throw error
    }
  }

  // Private helper methods

  private generateShareToken(): string {
    return randomBytes(32).toString('hex')
  }

  private generateShareUrl(shareToken: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `${baseUrl}/shared/reports/${shareToken}`
  }

  private async deactivateShareLink(shareToken: string, reason: string): Promise<void> {
    await prisma.reportShare.update({
      where: { shareToken },
      data: { isActive: false }
    })

    const shareRecord = await prisma.reportShare.findUnique({
      where: { shareToken }
    })

    if (shareRecord) {
      await this.trackSharingEvent(shareRecord.reportId, 'share_deactivated', {
        shareToken,
        reason
      })
    }
  }

  private async trackSharingEvent(
    reportId: string,
    eventType: string,
    metadata: any
  ): Promise<void> {
    try {
      await prisma.reportAnalytics.create({
        data: {
          reportId,
          eventType,
          eventData: JSON.stringify(metadata),
          createdAt: new Date()
        }
      })
    } catch (error) {
      AppLogger.error('Failed to track sharing event', {
        service: 'report-sharing',
        operation: 'track_sharing_event_error',
        metadata: {
          reportId,
          eventType,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * Clean up expired share links
   */
  async cleanupExpiredShares(): Promise<number> {
    try {
      const result = await prisma.reportShare.updateMany({
        where: {
          expiresAt: {
            lt: new Date()
          },
          isActive: true
        },
        data: {
          isActive: false
        }
      })

      AppLogger.info('Cleaned up expired share links', {
        service: 'report-sharing',
        operation: 'cleanup_expired_shares',
        metadata: {
          deactivatedCount: result.count
        }
      })

      return result.count

    } catch (error) {
      AppLogger.error('Failed to cleanup expired shares', {
        service: 'report-sharing',
        operation: 'cleanup_expired_shares_error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      return 0
    }
  }
}