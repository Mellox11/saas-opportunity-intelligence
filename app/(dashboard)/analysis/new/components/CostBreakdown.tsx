'use client'

import { motion } from 'framer-motion'
import { DollarSign, Server, Brain, Calculator } from 'lucide-react'
import { CostBreakdown as CostBreakdownType } from '@/lib/validation/cost-schema'
import { formatCurrency } from '@/lib/utils/cost-calculator'
import { cn } from '@/lib/utils'

interface CostBreakdownProps {
  breakdown: CostBreakdownType
  finalPrice: number
  showMarkup?: boolean
  className?: string
}

export function CostBreakdown({ 
  breakdown, 
  finalPrice,
  showMarkup = true,
  className 
}: CostBreakdownProps) {
  const markupAmount = finalPrice - breakdown.total
  const markupPercentage = ((markupAmount / breakdown.total) * 100).toFixed(0)
  
  const items = [
    {
      icon: Server,
      label: 'Reddit API',
      value: breakdown.reddit,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    {
      icon: Brain,
      label: 'AI Processing',
      value: breakdown.ai,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    }
  ]
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Individual Costs */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50"
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                item.bgColor
              )}>
                <item.icon className={cn('h-4 w-4', item.color)} />
              </div>
              <span className="text-sm text-gray-300">{item.label}</span>
            </div>
            <span className="text-sm font-medium text-white">
              {formatCurrency(item.value)}
            </span>
          </motion.div>
        ))}
      </div>
      
      {/* Subtotal */}
      <div className="pt-3 border-t border-gray-700">
        <div className="flex items-center justify-between px-3">
          <span className="text-sm text-gray-400">Base Cost</span>
          <span className="text-sm font-medium text-gray-300">
            {formatCurrency(breakdown.total)}
          </span>
        </div>
      </div>
      
      {/* Markup */}
      {showMarkup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Calculator className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <span className="text-sm text-gray-300">Service Markup</span>
                <span className="text-xs text-gray-500 ml-2">
                  ({markupPercentage}% transparent pricing)
                </span>
              </div>
            </div>
            <span className="text-sm font-medium text-white">
              +{formatCurrency(markupAmount)}
            </span>
          </div>
        </motion.div>
      )}
      
      {/* Total */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="pt-3 border-t border-gray-700"
      >
        <div className="flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <span className="text-lg font-semibold text-white">Total Price</span>
          </div>
          <motion.span 
            className="text-2xl font-bold text-green-500"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            {formatCurrency(finalPrice)}
          </motion.span>
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">
          Pay only for what you use • No hidden fees
        </p>
      </motion.div>
    </div>
  )
}