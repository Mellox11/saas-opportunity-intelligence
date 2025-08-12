'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Hash, DollarSign, Loader2 } from 'lucide-react'
import { type AnalysisConfiguration } from '@/lib/validation/analysis-schema'
import { CostEstimator } from './CostEstimator'
import { CostEstimateResponse } from '@/lib/validation/cost-schema'

interface ConfigurationPreviewProps {
  configuration: AnalysisConfiguration
  className?: string
}

interface EstimationData {
  estimatedPosts: number
  costs: {
    redditApi: number
    aiProcessing: number
    total: number
  }
  breakdown: Array<{
    subreddit: string
    estimatedPosts: number
  }>
}

export function ConfigurationPreview({ configuration, className }: ConfigurationPreviewProps) {
  const [estimation, setEstimation] = useState<EstimationData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debug logging to track configuration changes
  useEffect(() => {
    console.log('🔍 ConfigurationPreview received:', {
      subreddits: configuration.subreddits,
      subredditCount: configuration.subreddits?.length,
      timeRange: configuration.timeRange,
      keywords: configuration.keywords
    })
  }, [configuration])

  const fetchEstimation = useCallback(async () => {
    if (!configuration.subreddits?.length || !configuration.timeRange) {
      setEstimation(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/reddit/estimate-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subreddits: configuration.subreddits,
          timeRange: configuration.timeRange,
          keywords: configuration.keywords || { predefined: [], custom: [] }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch estimation')
      }

      const data = await response.json()
      setEstimation(data)
    } catch (err: any) {
      console.error('Estimation error:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [configuration])

  // Debounced estimation fetch
  useEffect(() => {
    const timeout = setTimeout(fetchEstimation, 500) // 500ms debounce
    return () => clearTimeout(timeout)
  }, [fetchEstimation])

  const totalKeywords = (configuration.keywords?.predefined?.length || 0) + (configuration.keywords?.custom?.length || 0)

  return (
    <Card className={`border-gray-800 bg-gray-900/50 backdrop-blur ${className}`}>
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Hash className="h-4 w-4" />
          Analysis Preview
        </CardTitle>
        <CardDescription>
          Real-time estimation of your analysis scope
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configuration Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Subreddits:</span>
            <span className="text-white font-medium">
              {configuration.subreddits?.length || 0}/3
            </span>
          </div>
          
          {configuration.subreddits && configuration.subreddits.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {configuration.subreddits.map(subreddit => (
                <Badge key={subreddit} variant="outline" className="text-xs border-gray-600">
                  r/{subreddit}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Time Range:</span>
            <span className="text-white font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {configuration.timeRange} days
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Keywords:</span>
            <span className="text-white font-medium">
              {totalKeywords} selected
            </span>
          </div>
        </div>

        {/* Estimation Results */}
        <div className="border-t border-gray-700 pt-4">
          {isLoading && (
            <div className="flex items-center justify-center py-4 text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Calculating estimate...
            </div>
          )}

          {error && (
            <div className="text-red-400 text-sm p-2 bg-red-500/10 border border-red-500/20 rounded">
              {error}
            </div>
          )}

          {estimation && !isLoading && !error && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Estimated Posts:</span>
                <span className="text-white font-semibold">
                  {estimation.estimatedPosts.toLocaleString()}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Estimated Cost:
                  </span>
                  <span className="text-green-400 font-semibold">
                    ${estimation.costs.total.toFixed(2)}
                  </span>
                </div>
                
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Reddit API:</span>
                    <span>${estimation.costs.redditApi.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>AI Processing:</span>
                    <span>${estimation.costs.aiProcessing.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {estimation.breakdown && estimation.breakdown.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-400">Posts by Subreddit:</div>
                  <div className="space-y-1">
                    {estimation.breakdown.map(item => (
                      <div key={item.subreddit} className="flex justify-between text-xs">
                        <span className="text-gray-300">r/{item.subreddit}:</span>
                        <span className="text-gray-400">~{item.estimatedPosts}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!configuration.subreddits?.length && !isLoading && (
            <div className="text-gray-500 text-sm text-center py-4">
              Select subreddits to see estimate
            </div>
          )}
        </div>

        {/* Configuration Name */}
        {configuration.name && (
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Configuration Name:</span>
              <span className="text-white font-medium truncate ml-2">
                {configuration.name}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}