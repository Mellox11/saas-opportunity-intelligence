'use client'

import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface TimeRangeSelectorProps {
  value: 30 | 60 | 90
  onChange: (timeRange: 30 | 60 | 90) => void
  disabled?: boolean
}

const TIME_RANGES = [
  { value: 30 as const, label: '30 Days', description: 'Past month' },
  { value: 60 as const, label: '60 Days', description: 'Past 2 months' },
  { value: 90 as const, label: '90 Days', description: 'Past 3 months' }
]

export function TimeRangeSelector({ value, onChange, disabled }: TimeRangeSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-300">
        Select time range for analysis
      </Label>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TIME_RANGES.map((range) => (
          <Button
            key={range.value}
            variant={value === range.value ? "default" : "outline"}
            disabled={disabled}
            onClick={() => onChange(range.value)}
            className={`h-auto p-4 flex flex-col items-center justify-center space-y-1 ${
              value === range.value 
                ? "bg-primary text-primary-foreground" 
                : "border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <div className="font-semibold text-base">{range.label}</div>
            <div className="text-xs opacity-70">{range.description}</div>
          </Button>
        ))}
      </div>

      <div className="text-xs text-gray-500 mt-2">
        Longer time ranges provide more data but may increase analysis costs
      </div>
    </div>
  )
}