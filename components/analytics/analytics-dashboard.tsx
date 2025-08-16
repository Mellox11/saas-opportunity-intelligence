'use client'

import React, { useState, useEffect } from 'react'
import { ReportAnalytics, UserAnalytics } from '@/lib/services/report-analytics.service'
import { AppLogger } from '@/lib/observability/logger'

/**
 * Analytics Dashboard Component
 * AC: 10 - Comprehensive analytics dashboard with usage metrics and performance data
 */

interface AnalyticsDashboardProps {
  reportId?: string
  showUserAnalytics?: boolean
  className?: string
}

export function AnalyticsDashboard({ 
  reportId, 
  showUserAnalytics = false, 
  className = '' 
}: AnalyticsDashboardProps) {
  const [reportAnalytics, setReportAnalytics] = useState<ReportAnalytics | null>(null)
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'usage' | 'sharing'>('overview')

  useEffect(() => {
    loadAnalytics()
  }, [reportId, showUserAnalytics])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const promises = []

      if (reportId) {
        promises.push(
          fetch(`/api/analytics/reports/${reportId}`)
            .then(res => res.json())
            .then(data => {
              if (!data.success) throw new Error(data.error)
              return data.data
            })
        )
      } else {
        promises.push(Promise.resolve(null))
      }

      if (showUserAnalytics) {
        promises.push(
          fetch('/api/analytics/user')
            .then(res => res.json())
            .then(data => {
              if (!data.success) throw new Error(data.error)
              return data.data
            })
        )
      } else {
        promises.push(Promise.resolve(null))
      }

      const [reportData, userData] = await Promise.all(promises)
      
      setReportAnalytics(reportData)
      setUserAnalytics(userData)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
      AppLogger.error('Failed to load analytics', {
        component: 'analytics-dashboard',
        operation: 'load_analytics_error',
        metadata: {
          reportId,
          showUserAnalytics,
          error: err instanceof Error ? err.message : 'Unknown error'
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h`
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 ${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Failed to Load Analytics
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const renderOverviewTab = () => {
    const analytics = reportAnalytics || userAnalytics
    if (!analytics) return null

    const isReport = reportAnalytics !== null

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {isReport ? 'Total Views' : 'Total Reports'}
              </h3>
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatNumber(isReport ? analytics.totalViews : (analytics as UserAnalytics).totalReports)}
            </div>
            {isReport && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatNumber(reportAnalytics!.uniqueViews)} unique viewers
              </p>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Total Shares
              </h3>
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatNumber(analytics.totalShares)}
            </div>
            {isReport && reportAnalytics?.shareAnalytics && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {reportAnalytics.shareAnalytics.activeShareLinks} active links
              </p>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {isReport ? 'Downloads' : 'Total Views'}
              </h3>
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatNumber(isReport ? analytics.totalDownloads || 0 : (analytics as UserAnalytics).totalViews)}
            </div>
            {isReport && reportAnalytics?.exportAnalytics && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Avg: {formatDuration(reportAnalytics.exportAnalytics.averageExportTime)}
              </p>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Total Cost
              </h3>
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency((analytics as UserAnalytics).totalCosts || 0)}
            </div>
            {!isReport && userAnalytics && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Avg: {formatCurrency((userAnalytics.totalCosts || 0) / Math.max(userAnalytics.totalReports, 1))}
              </p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        {userAnalytics?.recentActivity && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Recent Activity
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <div className="space-y-4">
                {userAnalytics.recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {activity.type === 'view' ? 'Viewed report' :
                         activity.type === 'generation' ? 'Generated report' :
                         activity.type === 'share_created' ? 'Shared report' :
                         activity.type === 'export' ? 'Exported report' :
                         activity.type}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                      {activity.reportId.slice(0, 8)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderPerformanceTab = () => {
    if (!reportAnalytics?.performanceMetrics) return null

    const metrics = reportAnalytics.performanceMetrics

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Avg Generation Time
            </h3>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatDuration(metrics.averageGenerationTime / 1000)}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Average Cost
            </h3>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(metrics.averageCost)}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Success Rate
            </h3>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {metrics.successRate.toFixed(1)}%
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Error Count
            </h3>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {metrics.errorCount}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderUsageTab = () => {
    if (!reportAnalytics?.usagePatterns) return null

    const patterns = reportAnalytics.usagePatterns

    return (
      <div className="space-y-6">
        {/* Device Types */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Device Types
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <div className="space-y-3">
              {patterns.deviceTypes.map((device, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {device.type}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(device.count / Math.max(...patterns.deviceTypes.map(d => d.count))) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-8">
                      {device.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Views by Hour */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Views by Hour
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <div className="flex items-end justify-between h-32 gap-1">
              {patterns.viewsByHour.map((hour, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div 
                    className="bg-blue-500 rounded-t min-h-1"
                    style={{ 
                      height: `${(hour.views / Math.max(...patterns.viewsByHour.map(h => h.views))) * 100}%`,
                      minHeight: hour.views > 0 ? '4px' : '0px'
                    }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {hour.hour}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderSharingTab = () => {
    if (!reportAnalytics?.shareAnalytics) return null

    const sharing = reportAnalytics.shareAnalytics

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Total Share Links
            </h3>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {sharing.totalShareLinks}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Active Links
            </h3>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {sharing.activeShareLinks}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Share Views
            </h3>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {sharing.totalShareViews}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Conversion Rate
            </h3>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {sharing.shareConversionRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Top Referrers */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Top Referrers
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <div className="space-y-3">
              {sharing.topReferrers.map((referrer, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {referrer.source}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(referrer.count / Math.max(...sharing.topReferrers.map(r => r.count))) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-8">
                      {referrer.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {reportId ? 'Report Analytics' : 'User Analytics'}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          {reportId 
            ? 'Detailed metrics and usage data for this report'
            : 'Your account activity and engagement metrics'
          }
        </p>
      </div>

      {/* Tabs */}
      {reportAnalytics && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'performance', label: 'Performance' },
              { id: 'usage', label: 'Usage Patterns' },
              { id: 'sharing', label: 'Sharing' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'performance' && renderPerformanceTab()}
        {activeTab === 'usage' && renderUsageTab()}
        {activeTab === 'sharing' && renderSharingTab()}
      </div>
    </div>
  )
}