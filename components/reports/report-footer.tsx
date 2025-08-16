'use client'

import React from 'react'
import { EnhancedReport } from '@/lib/types/report'
import { REPORT_BRANDING } from '@/lib/types/report'

/**
 * Professional report footer with disclaimers and additional information
 * AC: 5 - Report branding with Mercury.com design consistency
 */

interface ReportFooterProps {
  report: EnhancedReport
  isPrintMode?: boolean
}

export function ReportFooter({ report, isPrintMode = false }: ReportFooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-12">
      <div className="px-8 py-12">
        {/* Footer Content */}
        <div className="space-y-8">
          
          {/* Disclaimers */}
          <div>
            <h3 className={`${REPORT_BRANDING.typography.h3} mb-4 text-gray-900 dark:text-gray-100`}>
              Important Disclaimers
            </h3>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className={`${REPORT_BRANDING.typography.small} text-gray-700 dark:text-gray-300`}>
                    <strong>Investment Advisory:</strong> This report is for informational purposes only and does not constitute 
                    investment advice. Opportunity scores and revenue estimates are AI-generated projections based on limited 
                    data and should not be relied upon for investment decisions.
                  </p>
                </div>
                
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className={`${REPORT_BRANDING.typography.small} text-gray-700 dark:text-gray-300`}>
                    <strong>Data Accuracy:</strong> Analysis is based on public Reddit discussions and may not represent 
                    the complete market landscape. Revenue estimates are projections and actual results may vary significantly.
                  </p>
                </div>
                
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className={`${REPORT_BRANDING.typography.small} text-gray-700 dark:text-gray-300`}>
                    <strong>Confidentiality:</strong> This report contains confidential analysis. Distribution should be limited 
                    to authorized parties only. Do not share publicly or with competitors.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Methodology Summary */}
          <div>
            <h3 className={`${REPORT_BRANDING.typography.h3} mb-4 text-gray-900 dark:text-gray-100`}>
              Methodology Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                  <h4 className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100`}>
                    Data Collection
                  </h4>
                </div>
                <p className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-300`}>
                  Reddit API extraction from {report.metadata.analysisConfiguration.subreddits.length} curated subreddits
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h4 className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100`}>
                    AI Classification
                  </h4>
                </div>
                <p className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-300`}>
                  GPT-4 powered opportunity detection and feasibility assessment
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
                    </svg>
                  </div>
                  <h4 className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100`}>
                    Dimensional Scoring
                  </h4>
                </div>
                <p className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-300`}>
                  10-dimensional analysis across persona, market, and technical factors
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <h4 className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100`}>
                    Market Validation
                  </h4>
                </div>
                <p className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-300`}>
                  Community sentiment analysis and validation signal detection
                </p>
              </div>
            </div>
          </div>

          {/* Report Generation Details */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <h4 className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100`}>
                    SaaS Opportunity Intelligence Platform
                  </h4>
                </div>
                <p className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-300`}>
                  Advanced Reddit analysis for startup opportunity discovery
                </p>
              </div>
              
              <div className="text-left md:text-right">
                <p className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-300`}>
                  Report generated: {new Date(report.createdAt || Date.now()).toLocaleDateString()}
                </p>
                <p className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-300`}>
                  Processing time: {Math.round((report.metadata?.processingTime || 30000) / 1000)}s
                </p>
                <p className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-300`}>
                  Version: 2.4.0
                </p>
              </div>
            </div>
          </div>

          {/* Copyright and Legal */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <p className={`${REPORT_BRANDING.typography.small} text-gray-500 dark:text-gray-400`}>
                © {currentYear} SaaS Opportunity Intelligence Platform. All rights reserved.
              </p>
              
              {!isPrintMode && (
                <div className="flex items-center gap-4">
                  <button className={`${REPORT_BRANDING.typography.small} text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors`}>
                    Privacy Policy
                  </button>
                  <button className={`${REPORT_BRANDING.typography.small} text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors`}>
                    Terms of Service
                  </button>
                  <button className={`${REPORT_BRANDING.typography.small} text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors`}>
                    Support
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}