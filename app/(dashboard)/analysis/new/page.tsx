'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SubredditSelector } from './components/SubredditSelector'
import { TimeRangeSelector } from './components/TimeRangeSelector'
import { KeywordSelector } from './components/KeywordSelector'
import { ConfigurationPreview } from './components/ConfigurationPreview'
import { type AnalysisConfiguration, configurationSchema } from '@/lib/validation/analysis-schema'

export default function NewAnalysisPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [configuration, setConfiguration] = useState<Partial<AnalysisConfiguration>>({
    subreddits: [],
    timeRange: 30,
    keywords: {
      predefined: [],
      custom: []
    },
    name: ''
  })

  const handleConfigurationChange = (updates: Partial<AnalysisConfiguration>) => {
    setConfiguration(prev => ({
      ...prev,
      ...updates
    }))
    setError(null) // Clear errors on change
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Validate configuration using Zod schema
      const validatedConfig = configurationSchema.parse(configuration)

      const response = await fetch('/api/analysis/configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedConfig)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save configuration')
      }

      // Redirect to cost estimation page with the analysis ID
      router.push(`/analysis/${result.analysisId}/cost-estimation`)
    } catch (err: any) {
      if (err.name === 'ZodError') {
        const firstError = err.issues[0]
        setError(`Validation error: ${firstError.message}`)
      } else {
        setError(err.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Real-time validation
  const getValidationState = () => {
    try {
      configurationSchema.parse(configuration)
      return { isValid: true, errors: [] }
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return { 
          isValid: false, 
          errors: err.issues.map((issue: any) => ({
            path: issue.path.join('.'),
            message: issue.message
          }))
        }
      }
      return { isValid: false, errors: [] }
    }
  }

  const validation = getValidationState()
  const isFormValid = validation.isValid && !isLoading

  return (
    <div className="min-h-screen bg-gray-950 dot-grid">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Configure Analysis
            </h1>
            <p className="text-gray-400">
              Set up your Reddit data collection parameters to identify SaaS opportunities
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Configuration Name */}
              <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Configuration Name</CardTitle>
                  <CardDescription>
                    Give your analysis a descriptive name
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <input
                    type="text"
                    value={configuration.name || ''}
                    onChange={(e) => handleConfigurationChange({ name: e.target.value })}
                    placeholder="e.g., React Developer Pain Points Analysis"
                    disabled={isLoading}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 text-white placeholder:text-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </CardContent>
              </Card>

              {/* Subreddit Selection */}
              <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Select Subreddits</CardTitle>
                  <CardDescription>
                    Choose 1-3 subreddits to analyze for opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SubredditSelector
                    value={configuration.subreddits || []}
                    onChange={(subreddits) => handleConfigurationChange({ subreddits })}
                    disabled={isLoading}
                  />
                </CardContent>
              </Card>

              {/* Time Range Selection */}
              <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Time Range</CardTitle>
                  <CardDescription>
                    Select how far back to analyze posts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TimeRangeSelector
                    value={configuration.timeRange || 30}
                    onChange={(timeRange) => handleConfigurationChange({ timeRange })}
                    disabled={isLoading}
                  />
                </CardContent>
              </Card>

              {/* Keyword Selection */}
              <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Keywords & Filters</CardTitle>
                  <CardDescription>
                    Define pain points and problems to look for
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <KeywordSelector
                    value={configuration.keywords || { predefined: [], custom: [] }}
                    onChange={(keywords) => handleConfigurationChange({ keywords })}
                    disabled={isLoading}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Preview Panel */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <ConfigurationPreview
                  configuration={{
                    subreddits: configuration.subreddits || [],
                    timeRange: configuration.timeRange || 30,
                    keywords: configuration.keywords || { predefined: [], custom: [] },
                    name: configuration.name || ''
                  }}
                  className="mb-6"
                />

                {error && (
                  <div className="p-4 mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                    {error}
                  </div>
                )}

                {!validation.isValid && validation.errors.length > 0 && !error && (
                  <div className="p-4 mb-6 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="font-medium mb-2">Please fix the following:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {validation.errors.map((err, index) => (
                        <li key={index}>{err.message}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-3">
                  <Button
                    onClick={handleSubmit}
                    disabled={!isFormValid}
                    className="w-full"
                    size="lg"
                  >
                    {isLoading ? 'Saving Configuration...' : 'Continue to Cost Estimation'}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => router.push('/dashboard')}
                    disabled={isLoading}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}