'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, XCircle, Info } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/cost-calculator'
import { cn } from '@/lib/utils'

interface BudgetWarningProps {
  estimatedCost: number
  budgetLimit: number
  show: boolean
  variant?: 'exceeded' | 'approaching' | 'info'
  className?: string
  onDismiss?: () => void
}

export function BudgetWarning({
  estimatedCost,
  budgetLimit,
  show,
  variant,
  className,
  onDismiss
}: BudgetWarningProps) {
  // Auto-detect variant if not provided
  const warningVariant = variant || (() => {
    const percentUsed = (estimatedCost / budgetLimit) * 100
    if (percentUsed >= 100) return 'exceeded'
    if (percentUsed >= 80) return 'approaching'
    return 'info'
  })()
  
  const difference = Math.abs(estimatedCost - budgetLimit)
  const percentOver = ((estimatedCost - budgetLimit) / budgetLimit * 100).toFixed(0)
  
  const variants = {
    exceeded: {
      icon: XCircle,
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-400',
      iconColor: 'text-red-500',
      title: 'Budget Exceeded',
      message: `Estimated cost exceeds your budget by ${formatCurrency(difference)} (${percentOver}% over)`
    },
    approaching: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      textColor: 'text-yellow-400',
      iconColor: 'text-yellow-500',
      title: 'Approaching Budget Limit',
      message: `You have ${formatCurrency(budgetLimit - estimatedCost)} remaining in your budget`
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-400',
      iconColor: 'text-blue-500',
      title: 'Within Budget',
      message: `Estimated cost is within your budget with ${formatCurrency(budgetLimit - estimatedCost)} to spare`
    }
  }
  
  const config = variants[warningVariant]
  const Icon = config.icon
  
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'overflow-hidden',
            className
          )}
        >
          <div className={cn(
            'p-4 rounded-lg border flex items-start gap-3',
            config.bgColor,
            config.borderColor
          )}>
            <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', config.iconColor)} />
            <div className="flex-1 space-y-1">
              <h4 className={cn('font-medium', config.textColor)}>
                {config.title}
              </h4>
              <p className={cn('text-sm', config.textColor, 'opacity-90')}>
                {config.message}
              </p>
              
              {warningVariant === 'exceeded' && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-400">
                    Consider:
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1 ml-4">
                    <li>• Reducing the time range</li>
                    <li>• Selecting fewer subreddits</li>
                    <li>• Increasing your budget limit</li>
                  </ul>
                </div>
              )}
              
              {warningVariant === 'approaching' && (
                <p className="text-xs text-gray-500 mt-2">
                  The analysis will automatically stop if costs approach your limit
                </p>
              )}
            </div>
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={cn(
                  'p-1 rounded hover:bg-gray-700/50 transition-colors',
                  config.textColor
                )}
                aria-label="Dismiss warning"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}