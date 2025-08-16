'use client'

import React from 'react'
import { ExecutiveSummary, ReportMetadata } from '@/lib/types/report'
import { REPORT_BRANDING } from '@/lib/types/report'

/**
 * Executive Summary component with key metrics visualization
 * AC: 1 - Professional report layout with executive summary
 * AC: 5 - Professional formatting with Mercury.com branding
 */

interface ExecutiveSummaryProps {
  summary: ExecutiveSummary
  metadata: ReportMetadata
  isPrintMode?: boolean
}

export function ExecutiveSummarySection({ 
  summary, 
  metadata, 
  isPrintMode = false 
}: ExecutiveSummaryProps) {
  return (
    <div className="p-8">
      {/* Section Header */}
      <div className="mb-8">
        <h2 className={`${REPORT_BRANDING.typography.h2} mb-4 flex items-center gap-3`}>
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
            </svg>
          </div>
          Executive Summary
        </h2>
        <p className={`${REPORT_BRANDING.typography.body} text-gray-600 dark:text-gray-300`}>
          Key insights and recommendations from your SaaS opportunity analysis
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Opportunities */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400 uppercase tracking-wide`}>
              Total Opportunities
            </h3>
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className={`${REPORT_BRANDING.typography.h1} text-gray-900 dark:text-gray-100`}>
            {summary.totalOpportunities}
          </div>
          <p className={`${REPORT_BRANDING.typography.small} text-gray-500 dark:text-gray-400`}>
            Validated opportunities
          </p>
        </div>

        {/* Average Score */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400 uppercase tracking-wide`}>
              Average Score
            </h3>
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className={`${REPORT_BRANDING.typography.h1} text-gray-900 dark:text-gray-100`}>
            {summary.averageOpportunityScore}
          </div>
          <p className={`${REPORT_BRANDING.typography.small} text-gray-500 dark:text-gray-400`}>
            Out of 100 points
          </p>
        </div>

        {/* Processing Time */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400 uppercase tracking-wide`}>
              Analysis Time
            </h3>
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className={`${REPORT_BRANDING.typography.h1} text-gray-900 dark:text-gray-100`}>
            {Math.round(summary.processingMetrics.analysisTimeMs / 1000)}s
          </div>
          <p className={`${REPORT_BRANDING.typography.small} text-gray-500 dark:text-gray-400`}>
            Processing time
          </p>
        </div>

        {/* Total Cost */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400 uppercase tracking-wide`}>
              Analysis Cost
            </h3>
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
          <div className={`${REPORT_BRANDING.typography.h1} text-gray-900 dark:text-gray-100`}>
            ${summary.processingMetrics.totalCost.toFixed(2)}
          </div>
          <p className={`${REPORT_BRANDING.typography.small} text-gray-500 dark:text-gray-400`}>
            AI processing cost
          </p>
        </div>
      </div>

      {/* Top Personas */}
      {summary.topPersonas.length > 0 && (
        <div className="mb-8">
          <h3 className={`${REPORT_BRANDING.typography.h3} mb-4`}>Top User Personas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {summary.topPersonas.slice(0, 3).map((persona, index) => (
              <div key={persona.persona} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100`}>
                    {persona.persona.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <span className={`${REPORT_BRANDING.typography.small} text-gray-500 dark:text-gray-400`}>
                    #{index + 1}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-300`}>
                    {persona.count} opportunities
                  </span>
                  <span className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-300`}>
                    Avg: {persona.averageScore}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Size Distribution */}
      {summary.marketSizeDistribution.length > 0 && (
        <div className="mb-8">
          <h3 className={`${REPORT_BRANDING.typography.h3} mb-4`}>Market Size Distribution</h3>
          <div className="space-y-3">
            {summary.marketSizeDistribution.map((size) => (
              <div key={size.range} className="flex items-center">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`${REPORT_BRANDING.typography.body} text-gray-900 dark:text-gray-100`}>
                      {size.range}
                    </span>
                    <span className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-300`}>
                      {size.count} ({size.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${size.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Key Findings */}
        <div>
          <h3 className={`${REPORT_BRANDING.typography.h3} mb-4 flex items-center gap-2`}>
            <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Key Findings
          </h3>
          <ul className="space-y-3">
            {summary.keyFindings.map((finding, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                </div>
                <span className={`${REPORT_BRANDING.typography.body} text-gray-700 dark:text-gray-300`}>
                  {finding}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommended Actions */}
        <div>
          <h3 className={`${REPORT_BRANDING.typography.h3} mb-4 flex items-center gap-2`}>
            <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            Recommended Actions
          </h3>
          <ul className="space-y-3">
            {summary.recommendedActions.map((action, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-5 h-5 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <span className={`${REPORT_BRANDING.typography.body} text-gray-700 dark:text-gray-300`}>
                  {action}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Highest Scoring Opportunity Highlight */}
      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <h3 className={`${REPORT_BRANDING.typography.h3} text-gray-900 dark:text-gray-100`}>
            Top Opportunity
          </h3>
        </div>
        <p className={`${REPORT_BRANDING.typography.body} text-gray-700 dark:text-gray-300`}>
          <strong>{summary.highestScoringOpportunity}</strong> scored highest with {summary.averageOpportunityScore} points, 
          representing the most promising SaaS opportunity identified in this analysis.
        </p>
      </div>
    </div>
  )
}