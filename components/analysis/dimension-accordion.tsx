'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, BarChart3, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DimensionCard } from './dimension-card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DimensionalAnalysis } from '@/lib/types/dimensional-analysis'

interface DimensionAccordionProps {
  dimensions: DimensionalAnalysis
  onFeedback: (dimension: string, rating: 'positive' | 'negative') => void
  showHelp?: boolean
  className?: string
}

/**
 * Expandable dimension display with smooth animations
 * AC: 5 - Dimension breakdown displayed in expandable accordion sections of opportunity cards
 * AC: 8 - Dimension definitions and scoring criteria accessible via help tooltips
 */
export function DimensionAccordion({
  dimensions,
  onFeedback,
  showHelp = true,
  className
}: DimensionAccordionProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const getCompositeScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const scoredDimensions = [
    { key: 'emotionLevel', name: 'Emotion Level', data: dimensions.emotionLevel },
    { key: 'marketSize', name: 'Market Size', data: dimensions.marketSize },
    { key: 'technicalComplexity', name: 'Technical Complexity', data: dimensions.technicalComplexity },
    { key: 'existingSolutions', name: 'Existing Solutions', data: dimensions.existingSolutions },
    { key: 'budgetContext', name: 'Budget Context', data: dimensions.budgetContext },
    { key: 'timeSensitivity', name: 'Time Sensitivity', data: dimensions.timeSensitivity }
  ]

  const classifiedDimensions = [
    { key: 'persona', name: 'Persona', data: dimensions.persona },
    { key: 'industryVertical', name: 'Industry Vertical', data: dimensions.industryVertical },
    { key: 'userRole', name: 'User Role', data: dimensions.userRole },
    { key: 'workflowStage', name: 'Workflow Stage', data: dimensions.workflowStage }
  ]

  return (
    <div className={cn('space-y-4', className)}>
      {/* Composite Score Header */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Overall Opportunity Score
          </h3>
          <Badge 
            variant="outline" 
            className={cn('text-lg font-bold px-3 py-1', getCompositeScoreColor(dimensions.compositeScore))}
          >
            {dimensions.compositeScore}/100
          </Badge>
        </div>
        
        <Progress 
          value={dimensions.compositeScore} 
          className="h-3 mb-2"
        />
        
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Confidence: {Math.round(dimensions.confidenceScore * 100)}%</span>
          <span>Analysis v{dimensions.analysisVersion}</span>
        </div>
      </div>

      {/* Scored Dimensions Section */}
      <div className="bg-white rounded-lg border">
        <button
          onClick={() => toggleSection('scored')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900">
              Scored Dimensions (1-10 Scale)
            </span>
            <Badge variant="secondary" className="text-xs">
              {scoredDimensions.length}
            </Badge>
          </div>
          {expandedSections.has('scored') ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedSections.has('scored') && (
          <div className="p-4 border-t border-gray-100 space-y-4 animate-in slide-in-from-top-2 duration-300">
            {scoredDimensions.map(({ key, name, data }) => (
              <DimensionCard
                key={key}
                name={key}
                dimension={data}
                type="score"
                onFeedback={(rating) => onFeedback(key, rating)}
                showHelp={showHelp}
              />
            ))}
          </div>
        )}
      </div>

      {/* Classified Dimensions Section */}
      <div className="bg-white rounded-lg border">
        <button
          onClick={() => toggleSection('classified')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
        >
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-gray-900">
              Classified Dimensions (Categories)
            </span>
            <Badge variant="secondary" className="text-xs">
              {classifiedDimensions.length}
            </Badge>
          </div>
          {expandedSections.has('classified') ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedSections.has('classified') && (
          <div className="p-4 border-t border-gray-100 space-y-4 animate-in slide-in-from-top-2 duration-300">
            {classifiedDimensions.map(({ key, name, data }) => (
              <DimensionCard
                key={key}
                name={key}
                dimension={data}
                type="classification"
                onFeedback={(rating) => onFeedback(key, rating)}
                showHelp={showHelp}
              />
            ))}
          </div>
        )}
      </div>

      {/* Analysis Metadata */}
      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span>Processing time: {dimensions.processingTime}ms</span>
          {dimensions.createdAt && (
            <span>Analyzed: {new Date(dimensions.createdAt).toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  )
}