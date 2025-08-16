'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { FeedbackButtons } from '@/components/ui/feedback-buttons'
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  DimensionClassification, 
  DimensionScore, 
  DIMENSION_DEFINITIONS 
} from '@/lib/types/dimensional-analysis'

interface DimensionCardProps {
  name: string
  dimension: DimensionClassification | DimensionScore
  type: 'classification' | 'score'
  onFeedback: (rating: 'positive' | 'negative') => void
  showHelp?: boolean
  className?: string
}

/**
 * Individual dimension visualization card
 * AC: 4 - Analysis rationale provided for each dimension with specific quotes and reasoning
 * AC: 7 - User feedback mechanism (thumbs up/down) to validate scoring accuracy per dimension
 * AC: 8 - Dimension definitions and scoring criteria accessible via help tooltips
 */
export function DimensionCard({
  name,
  dimension,
  type,
  onFeedback,
  showHelp = true,
  className
}: DimensionCardProps) {
  const [showEvidence, setShowEvidence] = useState(false)
  const [showDefinition, setShowDefinition] = useState(false)

  const dimensionKey = name as keyof typeof DIMENSION_DEFINITIONS
  const definition = DIMENSION_DEFINITIONS[dimensionKey]

  const currentFeedback = dimension.feedback?.length 
    ? dimension.feedback[dimension.feedback.length - 1]?.userRating 
    : null

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getScoreColor = (score: number) => {
    if (name === 'technicalComplexity' || name === 'existingSolutions') {
      // For these dimensions, lower is better
      if (score <= 3) return 'text-green-600 bg-green-50'
      if (score <= 6) return 'text-yellow-600 bg-yellow-50'
      return 'text-red-600 bg-red-50'
    } else {
      // For other dimensions, higher is better
      if (score >= 7) return 'text-green-600 bg-green-50'
      if (score >= 4) return 'text-yellow-600 bg-yellow-50'
      return 'text-red-600 bg-red-50'
    }
  }

  return (
    <div className={cn('border rounded-lg p-4 bg-white', className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900">
            {definition?.name || name}
          </h4>
          {showHelp && (
            <button
              onClick={() => setShowDefinition(!showDefinition)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Show dimension definition"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Score/Value */}
          {type === 'score' ? (
            <Badge 
              variant="outline" 
              className={cn('font-semibold', getScoreColor((dimension as DimensionScore).score))}
            >
              {(dimension as DimensionScore).score}/10
            </Badge>
          ) : (
            <Badge variant="outline" className="font-medium">
              {(dimension as DimensionClassification).value}
            </Badge>
          )}

          {/* Confidence */}
          <Badge 
            variant="outline" 
            className={cn('text-xs', getConfidenceColor(dimension.confidence))}
          >
            {Math.round(dimension.confidence * 100)}%
          </Badge>

          {/* Feedback */}
          <FeedbackButtons
            onFeedback={onFeedback}
            currentRating={currentFeedback}
            size="sm"
          />
        </div>
      </div>

      {/* Help Text */}
      {showDefinition && definition && (
        <div className="mb-3 p-3 bg-blue-50 rounded-md border border-blue-200">
          <p className="text-sm text-blue-800 mb-1">{definition.description}</p>
          {type === 'score' && 'scale' in definition && (
            <p className="text-xs text-blue-600">{definition.scale}</p>
          )}
          {type === 'classification' && 'examples' in definition && (
            <p className="text-xs text-blue-600">
              Examples: {definition.examples.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Reasoning */}
      <div className="mb-3">
        <p className="text-sm text-gray-700">{dimension.reasoning}</p>
      </div>

      {/* Evidence Toggle */}
      {dimension.evidence.length > 0 && (
        <div>
          <button
            onClick={() => setShowEvidence(!showEvidence)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2"
          >
            {showEvidence ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Evidence ({dimension.evidence.length} quote{dimension.evidence.length !== 1 ? 's' : ''})
          </button>

          {showEvidence && (
            <div className="space-y-2">
              {dimension.evidence.map((quote, index) => (
                <blockquote 
                  key={index}
                  className="border-l-3 border-gray-200 pl-3 py-1 text-sm text-gray-600 italic"
                >
                  &ldquo;{quote}&rdquo;
                </blockquote>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alternatives for Classifications */}
      {type === 'classification' && (dimension as DimensionClassification).alternatives?.length && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Alternative classifications considered:</p>
          <div className="flex flex-wrap gap-1">
            {(dimension as DimensionClassification).alternatives!.map((alt, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {alt}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Weight for Scores */}
      {type === 'score' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Weight in composite score: {Math.round((dimension as DimensionScore).weight * 100)}%
          </p>
        </div>
      )}
    </div>
  )
}