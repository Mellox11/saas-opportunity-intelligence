'use client'

import React from 'react'
import { EnhancedReport } from '@/lib/types/report'
import { ExecutiveSummarySection } from './executive-summary'
import { OpportunityDetailCard } from './opportunity-detail-card'
import { MarketAnalysisSection } from './market-analysis-section'
import { ReportHeader } from './report-header'
import { ReportFooter } from './report-footer'
import { REPORT_BRANDING } from '@/lib/types/report'

/**
 * Main report layout component with Mercury.com branding
 * AC: 1 - Professional report layout with executive summary, detailed opportunities, and market analysis sections
 * AC: 5 - Report branding with dot grid design elements, consistent typography, and dark/light mode
 */

interface ReportLayoutProps {
  report: EnhancedReport
  className?: string
  isPrintMode?: boolean
  showInteractiveElements?: boolean
}

export function ReportLayout({ 
  report, 
  className = '',
  isPrintMode = false,
  showInteractiveElements = true
}: ReportLayoutProps) {
  return (
    <div className={`report-layout ${className}`}>
      {/* Dot grid background pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <pattern 
              id="dot-grid-report" 
              x="0" 
              y="0" 
              width={REPORT_BRANDING.dotGridPattern.size} 
              height={REPORT_BRANDING.dotGridPattern.size}
              patternUnits="userSpaceOnUse"
            >
              <circle 
                cx={REPORT_BRANDING.dotGridPattern.size / 2} 
                cy={REPORT_BRANDING.dotGridPattern.size / 2} 
                r="1" 
                fill="currentColor" 
                opacity={REPORT_BRANDING.dotGridPattern.opacity}
                className="text-gray-400 dark:text-gray-600"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid-report)" />
        </svg>
      </div>

      {/* Main report content */}
      <div className="relative z-10">
        {/* Report header */}
        <ReportHeader 
          report={report}
          isPrintMode={isPrintMode}
          showInteractiveElements={showInteractiveElements}
        />

        {/* Report content sections */}
        <div className={`${REPORT_BRANDING.sections.spacing} ${REPORT_BRANDING.sections.padding}`}>
          
          {/* Executive Summary Section */}
          {report.template.sections.find(s => s.type === 'executive-summary' && s.included) && (
            <section className={`report-section ${REPORT_BRANDING.sections.marginBottom}`}>
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <ExecutiveSummarySection 
                  summary={report.executiveSummary}
                  metadata={report.metadata}
                  isPrintMode={isPrintMode}
                />
              </div>
            </section>
          )}

          {/* Opportunities Section */}
          {report.template.sections.find(s => s.type === 'opportunities' && s.included) && (
            <section className={`report-section ${REPORT_BRANDING.sections.marginBottom}`}>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className={`${REPORT_BRANDING.typography.h2} flex items-center gap-3`}>
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    SaaS Opportunities ({report.opportunities.length})
                  </h2>
                  
                  {showInteractiveElements && !isPrintMode && (
                    <div className="flex items-center gap-2">
                      <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                        Sort by Score
                      </button>
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                        Filter
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid gap-6">
                  {report.opportunities
                    .sort((a, b) => b.opportunityScore - a.opportunityScore)
                    .map((opportunity, index) => (
                      <OpportunityDetailCard
                        key={opportunity.id}
                        opportunity={opportunity}
                        rank={index + 1}
                        isPrintMode={isPrintMode}
                        showInteractiveElements={showInteractiveElements}
                      />
                    ))}
                </div>
              </div>
            </section>
          )}

          {/* Market Analysis Section */}
          {report.template.sections.find(s => s.type === 'market-analysis' && s.included) && (
            <section className={`report-section ${REPORT_BRANDING.sections.marginBottom}`}>
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <MarketAnalysisSection 
                  analysis={report.marketAnalysis}
                  opportunities={report.opportunities}
                  isPrintMode={isPrintMode}
                  showInteractiveElements={showInteractiveElements}
                />
              </div>
            </section>
          )}

          {/* Methodology Section */}
          {report.template.sections.find(s => s.type === 'methodology' && s.included) && (
            <section className={`report-section ${REPORT_BRANDING.sections.marginBottom}`}>
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                <h2 className={`${REPORT_BRANDING.typography.h2} mb-6 flex items-center gap-3`}>
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  Methodology
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className={`${REPORT_BRANDING.typography.h3} mb-3`}>Data Sources</h3>
                    <div className={`${REPORT_BRANDING.typography.body} space-y-2`}>
                      <p>• Reddit posts from {report.metadata.analysisConfiguration.subreddits.length} subreddits</p>
                      <p>• {report.metadata.dataSourceSummary.totalPosts} posts and {report.metadata.dataSourceSummary.totalComments} comments analyzed</p>
                      <p>• Date range: {report.metadata.dataSourceSummary.dateRange.start.toLocaleDateString()} - {report.metadata.dataSourceSummary.dateRange.end.toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className={`${REPORT_BRANDING.typography.h3} mb-3`}>Analysis Process</h3>
                    <div className={`${REPORT_BRANDING.typography.body} space-y-2`}>
                      <p>• AI-powered opportunity classification using GPT-4</p>
                      <p>• 10-dimensional scoring across persona, market, and technical factors</p>
                      <p>• Comment sentiment analysis for community validation</p>
                      <p>• Revenue estimation based on market signals and persona analysis</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className={`${REPORT_BRANDING.typography.h3} mb-3`}>Quality Metrics</h3>
                    <div className={`${REPORT_BRANDING.typography.body} space-y-2`}>
                      <p>• Average confidence score: {Math.round(report.metadata.accuracyConfidence * 100)}%</p>
                      <p>• Processing time: {Math.round(report.metadata.processingTime / 1000)} seconds</p>
                      <p>• Total analysis cost: ${report.metadata.totalCosts.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Report footer */}
        <ReportFooter 
          report={report}
          isPrintMode={isPrintMode}
        />
      </div>

      {/* Print-specific styles */}
      {isPrintMode && (
        <style jsx>{`
          @media print {
            .report-layout {
              font-size: 12pt;
              line-height: 1.4;
            }
            
            .report-section {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            
            .report-section + .report-section {
              page-break-before: auto;
            }
            
            .no-print {
              display: none !important;
            }
          }
        `}</style>
      )}
    </div>
  )
}

// Export default for easier imports
export default ReportLayout