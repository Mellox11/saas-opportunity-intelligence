'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Plus, X } from 'lucide-react'
import { PREDEFINED_KEYWORDS } from '@/lib/validation/analysis-schema'

interface KeywordSelectorProps {
  value: {
    predefined: string[]
    custom: string[]
  }
  onChange: (keywords: { predefined: string[], custom: string[] }) => void
  disabled?: boolean
}

export function KeywordSelector({ value, onChange, disabled }: KeywordSelectorProps) {
  const [customInput, setCustomInput] = useState('')

  const handlePredefinedToggle = (keyword: string) => {
    const newPredefined = value.predefined.includes(keyword)
      ? value.predefined.filter(k => k !== keyword)
      : [...value.predefined, keyword]
    
    onChange({
      predefined: newPredefined,
      custom: value.custom
    })
  }

  const addCustomKeyword = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedInput = customInput.trim()
    
    if (!trimmedInput || trimmedInput.length > 50) return
    if (value.custom.includes(trimmedInput)) return
    
    onChange({
      predefined: value.predefined,
      custom: [...value.custom, trimmedInput]
    })
    
    setCustomInput('')
  }

  const removeCustomKeyword = (keyword: string) => {
    onChange({
      predefined: value.predefined,
      custom: value.custom.filter(k => k !== keyword)
    })
  }

  const selectAllInCategory = (category: keyof typeof PREDEFINED_KEYWORDS) => {
    const categoryKeywords = [...PREDEFINED_KEYWORDS[category]]
    const newPredefined = [...new Set([...value.predefined, ...categoryKeywords])]
    
    onChange({
      predefined: newPredefined,
      custom: value.custom
    })
  }

  const deselectAllInCategory = (category: keyof typeof PREDEFINED_KEYWORDS) => {
    const categoryKeywords = [...PREDEFINED_KEYWORDS[category]] as string[]
    const newPredefined = value.predefined.filter(k => !categoryKeywords.includes(k as any))
    
    onChange({
      predefined: newPredefined,
      custom: value.custom
    })
  }

  return (
    <div className="space-y-6">
      {/* Predefined Keywords by Category */}
      {Object.entries(PREDEFINED_KEYWORDS).map(([categoryKey, keywords]) => {
        const category = categoryKey as keyof typeof PREDEFINED_KEYWORDS
        const selectedCount = keywords.filter(k => value.predefined.includes(k)).length
        const allSelected = selectedCount === keywords.length
        const someSelected = selectedCount > 0 && selectedCount < keywords.length
        
        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-300 capitalize">
                {category.replace('_', ' ')} Keywords ({selectedCount}/{keywords.length})
              </Label>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => selectAllInCategory(category)}
                  disabled={disabled || allSelected}
                  className="h-6 px-2 text-xs text-gray-400 hover:text-white"
                >
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deselectAllInCategory(category)}
                  disabled={disabled || selectedCount === 0}
                  className="h-6 px-2 text-xs text-gray-400 hover:text-white"
                >
                  None
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {keywords.map((keyword) => {
                const isSelected = value.predefined.includes(keyword)
                return (
                  <div key={keyword} className="flex items-center space-x-2">
                    <Checkbox
                      id={`predefined-${keyword}`}
                      checked={isSelected}
                      disabled={disabled}
                      onCheckedChange={() => handlePredefinedToggle(keyword)}
                      className="border-gray-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label
                      htmlFor={`predefined-${keyword}`}
                      className="text-sm text-gray-300 cursor-pointer flex-1"
                    >
                      &ldquo;{keyword}&rdquo;
                    </Label>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Custom Keywords */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-300">
          Custom Keywords
        </Label>
        
        <form onSubmit={addCustomKeyword} className="flex gap-2">
          <Input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Add custom keyword..."
            disabled={disabled}
            maxLength={50}
            className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
          />
          <Button
            type="submit"
            variant="outline"
            disabled={disabled || !customInput.trim() || customInput.length > 50}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </form>
        
        {customInput.length > 40 && (
          <div className="text-xs text-yellow-500">
            {50 - customInput.length} characters remaining
          </div>
        )}
      </div>

      {/* Selected Custom Keywords */}
      {value.custom.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-300">
            Custom Keywords ({value.custom.length})
          </Label>
          <div className="flex flex-wrap gap-2">
            {value.custom.map((keyword) => (
              <Badge
                key={keyword}
                variant="secondary"
                className="bg-gray-800 text-gray-300 border border-gray-700 flex items-center gap-2"
              >
                &ldquo;{keyword}&rdquo;
                <button
                  onClick={() => removeCustomKeyword(keyword)}
                  disabled={disabled}
                  className="ml-1 hover:text-red-400 disabled:cursor-not-allowed"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="text-xs text-gray-500 bg-gray-800/20 p-3 rounded border border-gray-700">
        <div className="font-medium text-gray-400 mb-1">Keyword Summary:</div>
        <div>
          {value.predefined.length} predefined keywords, {value.custom.length} custom keywords
        </div>
        {(value.predefined.length === 0 && value.custom.length === 0) && (
          <div className="text-yellow-500 mt-1">
            No keywords selected - all posts will be included in analysis
          </div>
        )}
      </div>
    </div>
  )
}