'use client'

import { DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/cost-calculator'
import { cn } from '@/lib/utils'

interface CostDisplayProps {
  amount: number
  label?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showIcon?: boolean
  color?: 'default' | 'success' | 'warning' | 'error'
  className?: string
}

export function CostDisplay({
  amount,
  label,
  size = 'md',
  showIcon = true,
  color = 'default',
  className
}: CostDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-2xl'
  }
  
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
    xl: 'h-6 w-6'
  }
  
  const colorClasses = {
    default: 'text-white',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500'
  }
  
  const iconColorClasses = {
    default: 'text-blue-500',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500'
  }
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && (
        <span className="text-gray-400 text-sm">{label}:</span>
      )}
      <div className={cn(
        'flex items-center gap-1',
        sizeClasses[size],
        colorClasses[color]
      )}>
        {showIcon && (
          <DollarSign className={cn(
            iconSizes[size],
            iconColorClasses[color]
          )} />
        )}
        <span className="font-semibold">
          {formatCurrency(amount).replace('$', '')}
        </span>
      </div>
    </div>
  )
}