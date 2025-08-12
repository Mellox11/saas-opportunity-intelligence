'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { generateCostEstimate, formatCurrency } from '@/lib/utils/cost-calculator'
import { AnalysisConfiguration } from '@/lib/validation/analysis-schema'
import { CostEstimateResponse } from '@/lib/validation/cost-schema'
import { cn } from '@/lib/utils'

interface CostEstimatorProps {
  configuration: AnalysisConfiguration | null
  onCostUpdate?: (estimate: CostEstimateResponse | null) => void
  className?: string
}

export function CostEstimator({ 
  configuration, 
  onCostUpdate,
  className 
}: CostEstimatorProps) {
  const [isCalculating, setIsCalculating] = useState(false)
  const [estimate, setEstimate] = useState<CostEstimateResponse | null>(null)
  
  // Calculate estimate with debouncing
  useEffect(() => {
    if (!configuration) {
      setEstimate(null)
      onCostUpdate?.(null)
      return
    }
    
    setIsCalculating(true)
    const timer = setTimeout(() => {
      const newEstimate = generateCostEstimate(configuration)
      setEstimate(newEstimate)
      onCostUpdate?.(newEstimate)
      setIsCalculating(false)
    }, 300) // 300ms debounce
    
    return () => clearTimeout(timer)
  }, [configuration, onCostUpdate])
  
  const accuracyColor = useMemo(() => {
    if (!estimate) return 'text-gray-400'
    if (estimate.accuracy >= 90) return 'text-green-500'
    if (estimate.accuracy >= 75) return 'text-yellow-500'
    return 'text-red-500'
  }, [estimate])
  
  if (!configuration) {
    return (
      <Card className={cn(
        'p-6 bg-gray-800 border-gray-700',
        className
      )}>
        <div className="text-center text-gray-400">
          <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Configure your analysis to see cost estimate</p>
        </div>
      </Card>
    )
  }
  
  return (
    <Card className={cn(
      'p-6 bg-gray-800 border-gray-700',
      className
    )}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-500" />
            Cost Estimate
          </h3>
          {estimate && (
            <div className={cn('text-xs flex items-center gap-1', accuracyColor)}>
              <TrendingUp className="h-3 w-3" />
              {estimate.accuracy}% accuracy
            </div>
          )}
        </div>
        
        <AnimatePresence mode="wait">
          {isCalculating ? (
            <motion.div
              key="calculating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <div className="h-8 bg-gray-700 rounded animate-pulse" />
              <div className="h-6 bg-gray-700 rounded animate-pulse w-3/4" />
            </motion.div>
          ) : estimate ? (
            <motion.div
              key="estimate"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              {/* Breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Reddit API</span>
                  <span>{formatCurrency(estimate.breakdown.reddit)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>AI Analysis</span>
                  <span>{formatCurrency(estimate.breakdown.ai)}</span>
                </div>
                <div className="h-px bg-gray-700" />
                <div className="flex justify-between text-gray-300">
                  <span>Base Cost</span>
                  <span>{formatCurrency(estimate.breakdown.total)}</span>
                </div>
                <div className="flex justify-between text-gray-400 text-xs">
                  <span>4x Transparent Markup</span>
                  <span>×4</span>
                </div>
              </div>
              
              {/* Final Price */}
              <div className="pt-3 border-t border-gray-700">
                <div className="flex justify-between items-end">
                  <span className="text-gray-400">Total Estimate</span>
                  <motion.span 
                    className="text-2xl font-bold text-white"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    {formatCurrency(estimate.finalPrice)}
                  </motion.span>
                </div>
              </div>
              
              {/* Configuration Summary */}
              <div className="pt-2 text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <span>{configuration.subreddits.length} subreddit{configuration.subreddits.length > 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{configuration.timeRange} days</span>
                  <span>•</span>
                  <span>
                    {(configuration.keywords.predefined.length + configuration.keywords.custom.length)} keywords
                  </span>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </Card>
  )
}