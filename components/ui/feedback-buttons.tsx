'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeedbackButtonsProps {
  onFeedback: (rating: 'positive' | 'negative') => void
  currentRating?: 'positive' | 'negative' | null
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Thumbs up/down feedback buttons for dimensional scoring validation
 * AC: 7 - User feedback mechanism to validate scoring accuracy per dimension
 */
export function FeedbackButtons({
  onFeedback,
  currentRating,
  disabled = false,
  size = 'sm',
  className
}: FeedbackButtonsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFeedback = async (rating: 'positive' | 'negative') => {
    if (disabled || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onFeedback(rating)
    } finally {
      setIsSubmitting(false)
    }
  }

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8'
  }

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4'
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        onClick={() => handleFeedback('positive')}
        disabled={disabled || isSubmitting}
        className={cn(
          'inline-flex items-center justify-center rounded-full border transition-colors',
          'hover:bg-green-50 hover:border-green-300 disabled:opacity-50 disabled:cursor-not-allowed',
          sizeClasses[size],
          currentRating === 'positive'
            ? 'bg-green-100 border-green-400 text-green-700'
            : 'bg-white border-gray-200 text-gray-500 hover:text-green-600'
        )}
        title="Mark as accurate"
        aria-label="Thumbs up - mark as accurate"
      >
        <ThumbsUp className={iconSizeClasses[size]} />
      </button>

      <button
        onClick={() => handleFeedback('negative')}
        disabled={disabled || isSubmitting}
        className={cn(
          'inline-flex items-center justify-center rounded-full border transition-colors',
          'hover:bg-red-50 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed',
          sizeClasses[size],
          currentRating === 'negative'
            ? 'bg-red-100 border-red-400 text-red-700'
            : 'bg-white border-gray-200 text-gray-500 hover:text-red-600'
        )}
        title="Mark as inaccurate"
        aria-label="Thumbs down - mark as inaccurate"
      >
        <ThumbsDown className={iconSizeClasses[size]} />
      </button>

      {isSubmitting && (
        <div className="ml-1">
          <div className="w-3 h-3 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}