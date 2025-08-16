'use client'

import React from 'react'
import { EnhancedReport } from '@/lib/types/report'
import { REPORT_BRANDING } from '@/lib/types/report'

/**
 * Professional report header with Mercury.com branding
 * AC: 5 - Report branding with dot grid design elements and consistent typography
 */

interface ReportHeaderProps {
  report: EnhancedReport
  isPrintMode?: boolean
  showInteractiveElements?: boolean
}

export function ReportHeader({ 
  report, 
  isPrintMode = false,
  showInteractiveElements = true
}: ReportHeaderProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'standard': return 'Standard Analysis'
      case 'technical': return 'Technical Deep-Dive'
      case 'business': return 'Business Intelligence'
      case 'investor': return 'Investor Summary'
      default: return 'Analysis Report'
    }
  }

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="px-8 py-12">
        {/* Report Brand Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h1 className={`${REPORT_BRANDING.typography.h1} text-gray-900 dark:text-gray-100`}>
                SaaS Opportunity Intelligence
              </h1>
              <p className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400 uppercase tracking-wide`}>
                {getReportTypeLabel(report.reportType)} Report
              </p>
            </div>
          </div>
          
          {!isPrintMode && showInteractiveElements && (
            <div className="flex items-center gap-3">
              <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </button>
              <button className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                Share
              </button>
            </div>
          )}
        </div>

        {/* Report Metadata */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div>
              <h3 className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1`}>
                Report ID
              </h3>
              <p className={`${REPORT_BRANDING.typography.body} font-mono text-gray-900 dark:text-gray-100`}>
                {report.id.slice(0, 8)}...
              </p>
            </div>
            
            <div>
              <h3 className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1`}>
                Generated
              </h3>
              <p className={`${REPORT_BRANDING.typography.body} text-gray-900 dark:text-gray-100`}>
                {formatDate(report.metadata.generatedAt)}
              </p>
            </div>
            
            <div>
              <h3 className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1`}>
                Data Sources
              </h3>
              <p className={`${REPORT_BRANDING.typography.body} text-gray-900 dark:text-gray-100`}>
                {report.metadata.dataSourceSummary.totalPosts} posts, {report.metadata.dataSourceSummary.totalComments} comments
              </p>
            </div>
            
            <div>
              <h3 className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1`}>
                Analysis Period
              </h3>
              <p className={`${REPORT_BRANDING.typography.body} text-gray-900 dark:text-gray-100`}>
                {Math.ceil((report.metadata.dataSourceSummary.dateRange.end.getTime() - report.metadata.dataSourceSummary.dateRange.start.getTime()) / (1000 * 60 * 60 * 24))} days
              </p>
            </div>
            
            <div>
              <h3 className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1`}>
                Confidence
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        report.metadata.accuracyConfidence > 0.8 ? 'bg-green-500' :
                        report.metadata.accuracyConfidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${report.metadata.accuracyConfidence * 100}%` }}
                    />
                  </div>
                </div>
                <span className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-400`}>
                  {Math.round(report.metadata.accuracyConfidence * 100)}%
                </span>
              </div>
            </div>
          </div>
          
          {/* Analysis Configuration Summary */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100 mb-1`}>
                  Analysis Configuration
                </h3>
                <p className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-300`}>
                  Subreddits: {report.metadata.analysisConfiguration.subreddits.slice(0, 3).join(', ')}
                  {report.metadata.analysisConfiguration.subreddits.length > 3 && ` +${report.metadata.analysisConfiguration.subreddits.length - 3} more`}
                </p>
              </div>
              
              <div className="text-right">
                <p className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100`}>
                  ${report.metadata.totalCosts.toFixed(2)}
                </p>
                <p className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-300`}>
                  Total cost
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Report Description */}
        <div className="mt-8">
          <p className={`${REPORT_BRANDING.typography.body} text-gray-700 dark:text-gray-300 max-w-4xl`}>
            This report analyzes Reddit discussions to identify SaaS business opportunities using AI-powered 
            classification and multi-dimensional scoring. The analysis includes market validation, technical 
            feasibility assessment, revenue estimation, and strategic recommendations.
          </p>
        </div>
      </div>
    </header>
  )
}