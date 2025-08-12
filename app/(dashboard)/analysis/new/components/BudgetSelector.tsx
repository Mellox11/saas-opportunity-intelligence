'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, AlertTriangle, CheckCircle } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { formatCurrency, isWithinBudget, calculateBudgetStatus } from '@/lib/utils/cost-calculator'
import { cn } from '@/lib/utils'

interface BudgetSelectorProps {
  estimatedCost: number | null
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  className?: string
}

export function BudgetSelector({
  estimatedCost,
  value,
  onChange,
  min = 1,
  max = 1000,
  className
}: BudgetSelectorProps) {
  const [inputValue, setInputValue] = useState(value.toString())
  const [isFocused, setIsFocused] = useState(false)
  
  const budgetStatus = estimatedCost 
    ? calculateBudgetStatus(estimatedCost, value)
    : 'within_budget'
    
  const isExceeded = budgetStatus === 'exceeded'
  const isApproaching = budgetStatus === 'approaching_limit'
  
  useEffect(() => {
    if (!isFocused) {
      setInputValue(value.toString())
    }
  }, [value, isFocused])
  
  const handleSliderChange = (values: number[]) => {
    const newValue = values[0]
    onChange(newValue)
    setInputValue(newValue.toString())
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    const numValue = parseFloat(newValue)
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      onChange(numValue)
    }
  }
  
  const handleInputBlur = () => {
    setIsFocused(false)
    const numValue = parseFloat(inputValue)
    if (isNaN(numValue) || numValue < min || numValue > max) {
      setInputValue(value.toString())
    }
  }
  
  const getStatusColor = () => {
    if (isExceeded) return 'text-red-500'
    if (isApproaching) return 'text-yellow-500'
    return 'text-green-500'
  }
  
  const getSliderColor = () => {
    if (isExceeded) return 'bg-red-500'
    if (isApproaching) return 'bg-yellow-500'
    return 'bg-green-500'
  }
  
  const getStatusIcon = () => {
    if (isExceeded) return <AlertTriangle className="h-4 w-4" />
    if (isApproaching) return <AlertTriangle className="h-4 w-4" />
    return <CheckCircle className="h-4 w-4" />
  }
  
  const getStatusMessage = () => {
    if (!estimatedCost) return 'Set your spending limit'
    if (isExceeded) return `Budget exceeded by ${formatCurrency(estimatedCost - value)}`
    if (isApproaching) return 'Approaching budget limit'
    return `Within budget (${formatCurrency(value - estimatedCost)} remaining)`
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
            Budget Limit
          </h3>
          <div className={cn('flex items-center gap-2', getStatusColor())}>
            {getStatusIcon()}
            <span className="text-sm">{formatCurrency(value)}</span>
          </div>
        </div>
        
        {/* Slider */}
        <div className="space-y-2">
          <div className="relative">
            <Slider
              value={[value]}
              onValueChange={handleSliderChange}
              min={min}
              max={max}
              step={1}
              className="relative"
            />
            {estimatedCost && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -top-8 pointer-events-none"
                style={{
                  left: `${((estimatedCost - min) / (max - min)) * 100}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="bg-gray-700 text-xs text-white px-2 py-1 rounded">
                  Est: {formatCurrency(estimatedCost)}
                </div>
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-700 mx-auto" />
              </motion.div>
            )}
          </div>
          
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatCurrency(min)}</span>
            <span>{formatCurrency(max)}</span>
          </div>
        </div>
        
        {/* Input Field */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Manual Entry:</span>
          <div className="relative flex-1">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="number"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onBlur={handleInputBlur}
              min={min}
              max={max}
              step={1}
              className="pl-9 bg-gray-900 border-gray-700 text-white"
              placeholder="Enter budget"
            />
          </div>
        </div>
        
        {/* Status Message */}
        <motion.div
          key={budgetStatus}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'p-3 rounded-lg flex items-center gap-2 text-sm',
            isExceeded && 'bg-red-500/10 border border-red-500/20',
            isApproaching && 'bg-yellow-500/10 border border-yellow-500/20',
            !isExceeded && !isApproaching && 'bg-green-500/10 border border-green-500/20'
          )}
        >
          <div className={getStatusColor()}>
            {getStatusIcon()}
          </div>
          <span className={cn('flex-1', getStatusColor())}>
            {getStatusMessage()}
          </span>
        </motion.div>
        
        {/* Budget Preference Note */}
        <p className="text-xs text-gray-500 text-center">
          Your budget preference will be saved for future analyses
        </p>
      </div>
    </Card>
  )
}