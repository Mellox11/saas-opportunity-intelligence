'use client'

import React, { useState } from 'react'
import { EnhancedOpportunity } from '@/lib/types/report'
import { REPORT_BRANDING } from '@/lib/types/report'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

/**
 * Enhanced opportunity display with detailed information
 * AC: 2 - Each opportunity includes: problem statement, market evidence, technical assessment, revenue potential estimates
 * AC: 3 - Suggested SaaS solution descriptions with specific feature recommendations and differentiation strategies
 */

interface OpportunityDetailCardProps {
  opportunity: EnhancedOpportunity
  rank: number
  isPrintMode?: boolean
  showInteractiveElements?: boolean
}

export function OpportunityDetailCard({ 
  opportunity, 
  rank, 
  isPrintMode = false,
  showInteractiveElements = true
}: OpportunityDetailCardProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const toggleSection = (section: string) => {
    if (!showInteractiveElements) return
    
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900'
    if (score >= 60) return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900'
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900'
    return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${getScoreColor(opportunity.opportunityScore)}`}>
                #{rank}
              </div>
              <h3 className={`${REPORT_BRANDING.typography.h3} text-gray-900 dark:text-gray-100`}>
                {opportunity.title}
              </h3>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400`}>
                  Score:
                </span>
                <span className={`text-lg font-bold ${getScoreColor(opportunity.opportunityScore).split(' ')[0]} ${getScoreColor(opportunity.opportunityScore).split(' ')[1]}`}>
                  {opportunity.opportunityScore}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400`}>
                  Revenue:
                </span>
                <span className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100`}>
                  {formatCurrency(opportunity.revenueEstimate.annualRevenueMin)} - {formatCurrency(opportunity.revenueEstimate.annualRevenueMax)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400`}>
                  Complexity:
                </span>
                <span className={`${REPORT_BRANDING.typography.body} font-medium`}>
                  {opportunity.implementationComplexity}/10
                </span>
              </div>
            </div>

            <p className={`${REPORT_BRANDING.typography.body} text-gray-700 dark:text-gray-300`}>
              {opportunity.problemStatement}
            </p>
          </div>

          <div className="ml-6 flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(opportunity.opportunityScore)}`}>
                {opportunity.classification === 'saas_feasible' ? 'SaaS Feasible' : 'Not Feasible'}
              </span>
            </div>
            
            <div className={`${REPORT_BRANDING.typography.small} text-gray-500 dark:text-gray-400 text-right`}>
              r/{opportunity.sourcePost.subreddit}<br />
              {opportunity.sourcePost.score} upvotes, {opportunity.sourcePost.numComments} comments
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Sections */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        
        {/* Suggested Solution Section */}
        <div className="p-6">
          <button
            onClick={() => toggleSection('solution')}
            className={`w-full flex items-center justify-between ${showInteractiveElements ? 'hover:bg-gray-50 dark:hover:bg-gray-800' : ''} rounded-lg p-2 -m-2`}
            disabled={!showInteractiveElements}
          >
            <h4 className={`${REPORT_BRANDING.typography.h3} flex items-center gap-2`}>
              <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              Suggested SaaS Solution
            </h4>
            {showInteractiveElements && (
              expandedSections.has('solution') ? 
                <ChevronUpIcon className="w-5 h-5 text-gray-400" /> : 
                <ChevronDownIcon className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {(expandedSections.has('solution') || isPrintMode || !showInteractiveElements) && (
            <div className="mt-4 space-y-4">
              <div>
                <h5 className={`${REPORT_BRANDING.typography.body} font-semibold text-gray-900 dark:text-gray-100 mb-2`}>
                  {opportunity.suggestedSolution.productName}
                </h5>
                <p className={`${REPORT_BRANDING.typography.body} text-gray-600 dark:text-gray-300 italic mb-3`}>
                  &ldquo;{opportunity.suggestedSolution.tagline}&rdquo;
                </p>
                <p className={`${REPORT_BRANDING.typography.body} text-gray-700 dark:text-gray-300 mb-4`}>
                  {opportunity.suggestedSolution.differentiationStrategy}
                </p>
              </div>

              <div>
                <h6 className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100 mb-2`}>
                  Core Features:
                </h6>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {opportunity.suggestedSolution.coreFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      </div>
                      <span className={`${REPORT_BRANDING.typography.small} text-gray-700 dark:text-gray-300`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h6 className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100 mb-2`}>
                  Competitive Advantages:
                </h6>
                <ul className="space-y-1">
                  {opportunity.suggestedSolution.competitiveAdvantage.map((advantage, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={`${REPORT_BRANDING.typography.small} text-gray-700 dark:text-gray-300`}>
                        {advantage}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Revenue Estimate Section */}
        <div className="p-6">
          <button
            onClick={() => toggleSection('revenue')}
            className={`w-full flex items-center justify-between ${showInteractiveElements ? 'hover:bg-gray-50 dark:hover:bg-gray-800' : ''} rounded-lg p-2 -m-2`}
            disabled={!showInteractiveElements}
          >
            <h4 className={`${REPORT_BRANDING.typography.h3} flex items-center gap-2`}>
              <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              Revenue Potential
            </h4>
            {showInteractiveElements && (
              expandedSections.has('revenue') ? 
                <ChevronUpIcon className="w-5 h-5 text-gray-400" /> : 
                <ChevronDownIcon className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {(expandedSections.has('revenue') || isPrintMode || !showInteractiveElements) && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h6 className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400 mb-1`}>
                    Annual Revenue Range
                  </h6>
                  <p className={`${REPORT_BRANDING.typography.h3} text-gray-900 dark:text-gray-100`}>
                    {formatCurrency(opportunity.revenueEstimate.annualRevenueMin)} - {formatCurrency(opportunity.revenueEstimate.annualRevenueMax)}
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h6 className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400 mb-1`}>
                    Pricing Model
                  </h6>
                  <p className={`${REPORT_BRANDING.typography.body} text-gray-900 dark:text-gray-100 capitalize`}>
                    {opportunity.revenueEstimate.pricingModel.replace('-', ' ')}
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h6 className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400 mb-1`}>
                    Market Size
                  </h6>
                  <p className={`${REPORT_BRANDING.typography.body} text-gray-900 dark:text-gray-100 capitalize`}>
                    {opportunity.revenueEstimate.marketSizeIndicator}
                  </p>
                </div>
              </div>

              <div>
                <h6 className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100 mb-2`}>
                  Pricing Recommendation:
                </h6>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <p className={`${REPORT_BRANDING.typography.body} text-gray-900 dark:text-gray-100 font-medium mb-1`}>
                    {opportunity.revenueEstimate.pricingRecommendation.pricePoint} ({opportunity.revenueEstimate.pricingRecommendation.pricingTier} tier)
                  </p>
                  <p className={`${REPORT_BRANDING.typography.small} text-gray-700 dark:text-gray-300`}>
                    {opportunity.revenueEstimate.pricingRecommendation.justification}
                  </p>
                </div>
              </div>

              <div>
                <h6 className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100 mb-2`}>
                  Reasoning:
                </h6>
                <p className={`${REPORT_BRANDING.typography.small} text-gray-700 dark:text-gray-300`}>
                  {opportunity.revenueEstimate.reasoning}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Technical Assessment Section */}
        <div className="p-6">
          <button
            onClick={() => toggleSection('technical')}
            className={`w-full flex items-center justify-between ${showInteractiveElements ? 'hover:bg-gray-50 dark:hover:bg-gray-800' : ''} rounded-lg p-2 -m-2`}
            disabled={!showInteractiveElements}
          >
            <h4 className={`${REPORT_BRANDING.typography.h3} flex items-center gap-2`}>
              <div className="w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              Technical Assessment
            </h4>
            {showInteractiveElements && (
              expandedSections.has('technical') ? 
                <ChevronUpIcon className="w-5 h-5 text-gray-400" /> : 
                <ChevronDownIcon className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {(expandedSections.has('technical') || isPrintMode || !showInteractiveElements) && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h6 className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400 mb-1`}>
                    Implementation Complexity
                  </h6>
                  <p className={`${REPORT_BRANDING.typography.h3} text-gray-900 dark:text-gray-100`}>
                    {opportunity.technicalAssessment.implementationComplexity}/10
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h6 className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400 mb-1`}>
                    Development Time
                  </h6>
                  <p className={`${REPORT_BRANDING.typography.body} text-gray-900 dark:text-gray-100`}>
                    {opportunity.technicalAssessment.developmentTimeEstimate}
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h6 className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400 mb-1`}>
                    Maintenance Complexity
                  </h6>
                  <p className={`${REPORT_BRANDING.typography.body} text-gray-900 dark:text-gray-100`}>
                    {opportunity.technicalAssessment.maintenanceComplexity}/10
                  </p>
                </div>
              </div>

              <div>
                <h6 className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100 mb-2`}>
                  Core Features:
                </h6>
                <div className="space-y-2">
                  {opportunity.technicalAssessment.coreFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-1">
                        <span className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100`}>
                          {feature.name}
                        </span>
                        <p className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-400`}>
                          {feature.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          feature.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          feature.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {feature.priority}
                        </span>
                        <span className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-400`}>
                          {feature.complexity}/10
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h6 className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100 mb-2`}>
                    Technical Risks:
                  </h6>
                  <ul className="space-y-1">
                    {opportunity.technicalAssessment.technicalRisks.map((risk, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-orange-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className={`${REPORT_BRANDING.typography.small} text-gray-700 dark:text-gray-300`}>
                          {risk}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h6 className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100 mb-2`}>
                    Security Considerations:
                  </h6>
                  <ul className="space-y-1">
                    {opportunity.technicalAssessment.securityConsiderations.map((consideration, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span className={`${REPORT_BRANDING.typography.small} text-gray-700 dark:text-gray-300`}>
                          {consideration}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Market Evidence Section */}
        <div className="p-6">
          <h4 className={`${REPORT_BRANDING.typography.h3} mb-4 flex items-center gap-2`}>
            <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
              </svg>
            </div>
            Market Evidence
          </h4>
          
          <ul className="space-y-2">
            {opportunity.evidence.map((evidence, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                </div>
                <span className={`${REPORT_BRANDING.typography.small} text-gray-700 dark:text-gray-300`}>
                  &ldquo;{evidence}&rdquo;
                </span>
              </li>
            ))}
          </ul>

          {opportunity.communityReaction && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h6 className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100 mb-2`}>
                Community Validation ({opportunity.communityReaction.totalComments} comments)
              </h6>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className={`${REPORT_BRANDING.typography.h3} text-green-600 dark:text-green-400`}>
                    {opportunity.communityReaction.validationSignals.agreements}
                  </p>
                  <p className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400`}>
                    Agreements
                  </p>
                </div>
                <div>
                  <p className={`${REPORT_BRANDING.typography.h3} text-red-600 dark:text-red-400`}>
                    {opportunity.communityReaction.validationSignals.disagreements}
                  </p>
                  <p className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400`}>
                    Disagreements
                  </p>
                </div>
                <div>
                  <p className={`${REPORT_BRANDING.typography.h3} text-blue-600 dark:text-blue-400`}>
                    {opportunity.communityReaction.averageSentiment > 0 ? '+' : ''}{opportunity.communityReaction.averageSentiment.toFixed(2)}
                  </p>
                  <p className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400`}>
                    Avg Sentiment
                  </p>
                </div>
                <div>
                  <p className={`${REPORT_BRANDING.typography.h3} text-purple-600 dark:text-purple-400 capitalize`}>
                    {opportunity.communityReaction.enthusiasmLevel}
                  </p>
                  <p className={`${REPORT_BRANDING.typography.caption} text-gray-600 dark:text-gray-400`}>
                    Enthusiasm
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}