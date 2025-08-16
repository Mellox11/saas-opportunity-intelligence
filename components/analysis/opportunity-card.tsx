'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DimensionAccordion } from './dimension-accordion'
import { Lightbulb, ExternalLink, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DimensionalAnalysis } from '@/lib/types/dimensional-analysis'

interface OpportunityCardProps {
  opportunity: {
    id: string
    title: string
    problemStatement: string
    opportunityScore: number
    confidenceScore: number
    urgencyScore: number
    marketSignalsScore: number
    feasibilityScore: number
    classification: string
    evidence: string
    scoringDimensions?: string
    sourcePost?: {
      permalink: string
      subreddit: string
    }
  }
  onDimensionFeedback?: (dimensionName: string, rating: 'positive' | 'negative') => void
  className?: string
}

/**
 * Enhanced opportunity card with dimensional analysis breakdown
 * AC: 5 - Dimension breakdown displayed in expandable accordion sections of opportunity cards
 */
export function OpportunityCard({
  opportunity,
  onDimensionFeedback,
  className
}: OpportunityCardProps) {
  const [showDimensions, setShowDimensions] = useState(false)

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const parsedEvidence = (() => {
    try {
      return JSON.parse(opportunity.evidence)
    } catch {
      return []
    }
  })()

  const dimensionalAnalysis = (() => {
    if (!opportunity.scoringDimensions) return null
    try {
      return JSON.parse(opportunity.scoringDimensions) as DimensionalAnalysis
    } catch {
      return null
    }
  })()

  const handleDimensionFeedback = (dimensionName: string, rating: 'positive' | 'negative') => {
    if (onDimensionFeedback) {
      onDimensionFeedback(dimensionName, rating)
    }
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            {opportunity.title}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn('font-semibold', getScoreColor(opportunity.opportunityScore))}
            >
              {opportunity.opportunityScore}/100
            </Badge>
            
            {opportunity.sourcePost && (
              <a
                href={`https://reddit.com${opportunity.sourcePost.permalink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="View original Reddit post"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {opportunity.sourcePost && (
          <Badge variant="secondary" className="w-fit">
            r/{opportunity.sourcePost.subreddit}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Problem Statement */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Problem Statement</h4>
          <p className="text-gray-700 text-sm leading-relaxed">
            {opportunity.problemStatement}
          </p>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {opportunity.confidenceScore}%
            </div>
            <div className="text-xs text-gray-500">Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {opportunity.urgencyScore}/100
            </div>
            <div className="text-xs text-gray-500">Urgency</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {opportunity.marketSignalsScore}/100
            </div>
            <div className="text-xs text-gray-500">Market</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {opportunity.feasibilityScore}/100
            </div>
            <div className="text-xs text-gray-500">Feasibility</div>
          </div>
        </div>

        {/* Evidence */}
        {parsedEvidence.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Supporting Evidence
            </h4>
            <div className="space-y-2">
              {parsedEvidence.slice(0, 3).map((quote: string, index: number) => (
                <blockquote 
                  key={index}
                  className="border-l-3 border-gray-200 pl-3 py-1 text-sm text-gray-600 italic"
                >
                  &ldquo;{quote}&rdquo;
                </blockquote>
              ))}
              {parsedEvidence.length > 3 && (
                <p className="text-xs text-gray-500">
                  +{parsedEvidence.length - 3} more evidence points
                </p>
              )}
            </div>
          </div>
        )}

        {/* Dimensional Analysis */}
        {dimensionalAnalysis && (
          <div>
            <button
              onClick={() => setShowDimensions(!showDimensions)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-gray-900">
                Dimensional Analysis Breakdown
              </span>
              <Badge variant="outline" className="ml-2">
                {dimensionalAnalysis.compositeScore}/100
              </Badge>
            </button>

            {showDimensions && (
              <div className="mt-4">
                <DimensionAccordion
                  dimensions={dimensionalAnalysis}
                  onFeedback={handleDimensionFeedback}
                  showHelp={true}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}