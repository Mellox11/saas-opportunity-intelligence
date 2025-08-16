'use client'

import React from 'react'
import { MarketAnalysis, EnhancedOpportunity } from '@/lib/types/report'
import { REPORT_BRANDING } from '@/lib/types/report'

/**
 * Market Analysis section with charts and trend visualization
 * AC: 4 - Market analysis section with trending topics, problem frequency analysis, and seasonal patterns
 */

interface MarketAnalysisSectionProps {
  analysis: MarketAnalysis
  opportunities: EnhancedOpportunity[]
  isPrintMode?: boolean
  showInteractiveElements?: boolean
}

export function MarketAnalysisSection({ 
  analysis, 
  opportunities,
  isPrintMode = false,
  showInteractiveElements = true
}: MarketAnalysisSectionProps) {
  const getMaturityColor = (maturity: string) => {
    switch (maturity) {
      case 'emerging': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900'
      case 'growing': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900'
      case 'mature': return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900'
      case 'declining': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900'
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900'
    }
  }

  const getTrendDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'increasing':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        )
      case 'decreasing':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8" />
          </svg>
        )
    }
  }

  const maxPersonaCount = Math.max(...analysis.personaDistribution.map(p => p.count))
  const maxIndustryCount = Math.max(...analysis.industryVerticals.map(i => i.count))

  return (
    <div className="p-8">
      {/* Section Header */}
      <div className="mb-8">
        <h2 className={`${REPORT_BRANDING.typography.h2} mb-4 flex items-center gap-3`}>
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
            </svg>
          </div>
          Market Analysis
        </h2>
        <p className={`${REPORT_BRANDING.typography.body} text-gray-600 dark:text-gray-300`}>
          Comprehensive market insights, trending topics, and persona distribution analysis
        </p>
      </div>

      {/* Market Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h3 className={`${REPORT_BRANDING.typography.h3} mb-2`}>Market Maturity</h3>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getMaturityColor(analysis.marketMaturity)}`}>
              {analysis.marketMaturity.charAt(0).toUpperCase() + analysis.marketMaturity.slice(1)}
            </span>
          </div>
          <p className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-400 mt-2`}>
            Based on competition and complexity analysis
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h3 className={`${REPORT_BRANDING.typography.h3} mb-2`}>Top Trending Topic</h3>
          <div className="flex items-center justify-between">
            <span className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100`}>
              {analysis.trendingTopics[0]?.topic || 'No trends identified'}
            </span>
            <span className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-400`}>
              {analysis.trendingTopics[0]?.frequency || 0} mentions
            </span>
          </div>
          <p className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-400 mt-2`}>
            Score: {analysis.trendingTopics[0]?.score || 0}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h3 className={`${REPORT_BRANDING.typography.h3} mb-2`}>Dominant Persona</h3>
          <div className="flex items-center justify-between">
            <span className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100`}>
              {analysis.personaDistribution[0]?.persona.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'No personas identified'}
            </span>
            <span className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-400`}>
              {analysis.personaDistribution[0]?.percentage || 0}%
            </span>
          </div>
          <p className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-400 mt-2`}>
            Avg Score: {analysis.personaDistribution[0]?.avgScore || 0}
          </p>
        </div>
      </div>

      {/* Trending Topics */}
      <div className="mb-8">
        <h3 className={`${REPORT_BRANDING.typography.h3} mb-6 flex items-center gap-2`}>
          <div className="w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          Trending Topics
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analysis.trendingTopics.slice(0, 8).map((topic, index) => (
            <div key={topic.topic} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100`}>
                  #{index + 1} {topic.topic}
                </h4>
                <div className="flex items-center gap-2">
                  <span className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-400`}>
                    {topic.frequency}x
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    topic.growth > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    topic.growth < 0 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {topic.growth > 0 ? '+' : ''}{topic.growth}%
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(topic.score / 100) * 100}%` }}
                    />
                  </div>
                </div>
                <span className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-400 ml-3`}>
                  {topic.score}
                </span>
              </div>
              
              {topic.relatedKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {topic.relatedKeywords.slice(0, 3).map((keyword) => (
                    <span key={keyword} className={`px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300`}>
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Persona Distribution */}
      <div className="mb-8">
        <h3 className={`${REPORT_BRANDING.typography.h3} mb-6 flex items-center gap-2`}>
          <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          Persona Distribution
        </h3>
        
        <div className="space-y-4">
          {analysis.personaDistribution.map((persona) => (
            <div key={persona.persona} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100`}>
                  {persona.persona.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h4>
                <div className="flex items-center gap-4">
                  <span className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-400`}>
                    {persona.count} opportunities ({persona.percentage}%)
                  </span>
                  <span className={`${REPORT_BRANDING.typography.small} font-medium text-gray-900 dark:text-gray-100`}>
                    Avg Score: {persona.avgScore}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center mb-3">
                <div className="flex-1">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-purple-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${(persona.count / maxPersonaCount) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              {persona.topIndustries.length > 0 && (
                <div>
                  <span className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-400`}>
                    Top Industries: 
                  </span>
                  <span className={`${REPORT_BRANDING.typography.small} text-gray-700 dark:text-gray-300`}>
                    {persona.topIndustries.join(', ')}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Industry Verticals */}
      <div className="mb-8">
        <h3 className={`${REPORT_BRANDING.typography.h3} mb-6 flex items-center gap-2`}>
          <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          Industry Verticals
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analysis.industryVerticals.map((industry) => (
            <div key={industry.vertical} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100`}>
                  {industry.vertical.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h4>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getMaturityColor(industry.maturity)}`}>
                  {industry.maturity}
                </span>
              </div>
              
              <div className="flex items-center justify-between mb-3">
                <span className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-400`}>
                  {industry.count} opportunities ({industry.percentage}%)
                </span>
                <span className={`${REPORT_BRANDING.typography.small} font-medium text-gray-900 dark:text-gray-100`}>
                  Avg: {industry.avgScore}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(industry.count / maxIndustryCount) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  {getTrendDirectionIcon(industry.growth > 5 ? 'increasing' : industry.growth < -5 ? 'decreasing' : 'stable')}
                  <span className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-400`}>
                    {industry.growth > 0 ? '+' : ''}{industry.growth}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Problem Frequency Analysis */}
      <div className="mb-8">
        <h3 className={`${REPORT_BRANDING.typography.h3} mb-6 flex items-center gap-2`}>
          <div className="w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
            </svg>
          </div>
          Problem Frequency Analysis
        </h3>
        
        <div className="space-y-3">
          {analysis.problemFrequency.map((problem) => (
            <div key={problem.problemCategory} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100`}>
                      {problem.problemCategory}
                    </h4>
                    <div className="flex items-center gap-3">
                      <span className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-400`}>
                        {problem.frequency} occurrences
                      </span>
                      <span className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-400`}>
                        Intensity: {problem.intensity}/10
                      </span>
                      <div className="flex items-center gap-1">
                        {getTrendDirectionIcon(problem.trendDirection)}
                        <span className={`${REPORT_BRANDING.typography.small} capitalize text-gray-600 dark:text-gray-400`}>
                          {problem.trendDirection}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(problem.intensity / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seasonal Patterns */}
      {analysis.seasonalPatterns && analysis.seasonalPatterns.length > 0 && (
        <div className="mb-8">
          <h3 className={`${REPORT_BRANDING.typography.h3} mb-6 flex items-center gap-2`}>
            <div className="w-6 h-6 bg-indigo-500 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Seasonal Patterns
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysis.seasonalPatterns.map((pattern) => (
              <div key={pattern.period} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className={`${REPORT_BRANDING.typography.body} font-medium text-gray-900 dark:text-gray-100 mb-2`}>
                  {pattern.period}
                </h4>
                <p className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-400 mb-3`}>
                  {pattern.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-400`}>
                      Intensity:
                    </span>
                    <span className={`${REPORT_BRANDING.typography.small} font-medium text-gray-900 dark:text-gray-100`}>
                      {pattern.intensity}/10
                    </span>
                  </div>
                  <span className={`${REPORT_BRANDING.typography.small} text-gray-600 dark:text-gray-400`}>
                    {Math.round(pattern.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitive Insights */}
      <div>
        <h3 className={`${REPORT_BRANDING.typography.h3} mb-6 flex items-center gap-2`}>
          <div className="w-6 h-6 bg-yellow-500 rounded-lg flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 16.5m6.878-6.622L16.5 3m-6.622 6.878L3 16.5" />
            </svg>
          </div>
          Competitive Insights
        </h3>
        
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-6">
          <ul className="space-y-3">
            {analysis.competitiveInsights.map((insight, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className={`${REPORT_BRANDING.typography.body} text-gray-700 dark:text-gray-300`}>
                  {insight}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}