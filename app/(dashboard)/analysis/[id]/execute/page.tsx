'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Play, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface AnalysisProgress {
  stage: string
  message: string
  percentage: number
  totalPosts?: number
  processedPosts?: number
  opportunitiesFound?: number
  estimatedCompletion?: string
  error?: string
}

interface AnalysisStatus {
  id: string
  status: string
  progress: AnalysisProgress | null
  createdAt: string
  completedAt?: string
  estimatedCompletion?: string
  estimatedCost?: number
  budgetLimit?: number
  statistics?: {
    totalPosts: number
    opportunitiesFound: number
    conversionRate: number
    processingTimeMinutes: number
  }
}

export default function ExecuteAnalysisPage() {
  const router = useRouter()
  const params = useParams()
  const analysisId = params.id as string

  const [analysis, setAnalysis] = useState<AnalysisStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Polling interval for status updates
  useEffect(() => {
    let interval: NodeJS.Timeout

    const fetchAnalysisStatus = async () => {
      try {
        const response = await fetch(`/api/analysis/${analysisId}/status`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch analysis status')
        }
        
        const data = await response.json()
        
        if (data.success) {
          setAnalysis(data.analysis)
          setError(null)
        } else {
          setError(data.error || 'Failed to load analysis')
        }
      } catch (err) {
        console.error('Error fetching analysis status:', err)
        setError(err instanceof Error ? err.message : 'Failed to load analysis')
      } finally {
        setIsLoading(false)
      }
    }

    // Initial fetch
    fetchAnalysisStatus()

    // Poll for updates every 2 seconds if analysis is processing
    if (analysis?.status === 'processing') {
      interval = setInterval(fetchAnalysisStatus, 2000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [analysisId, analysis?.status])

  const handleStartAnalysis = async () => {
    setIsStarting(true)
    setError(null)

    try {
      const response = await fetch(`/api/analysis/${analysisId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to start analysis')
      }

      // Update local state to show processing immediately
      setAnalysis(prev => prev ? {
        ...prev,
        status: 'processing',
        progress: {
          stage: 'initializing',
          message: 'Starting analysis pipeline...',
          percentage: 0
        }
      } : null)

    } catch (err) {
      console.error('Error starting analysis:', err)
      setError(err instanceof Error ? err.message : 'Failed to start analysis')
    } finally {
      setIsStarting(false)
    }
  }

  const handleViewResults = () => {
    router.push(`/analysis/${analysisId}/results`)
  }

  const getStatusDisplay = () => {
    if (isLoading) return { title: 'Loading...', description: 'Loading analysis details...' }
    if (error) return { title: 'Error', description: error }
    if (!analysis) return { title: 'Not Found', description: 'Analysis not found' }

    switch (analysis.status) {
      case 'pending':
      case 'cost_approved':
        return { 
          title: 'Ready to Execute', 
          description: 'Cost approved - ready to start your Reddit analysis' 
        }
      case 'processing':
        return { 
          title: 'Processing...', 
          description: analysis.progress?.message || 'Analyzing Reddit data for SaaS opportunities' 
        }
      case 'completed':
        return { 
          title: 'Analysis Complete', 
          description: 'Analysis complete! View your results below.' 
        }
      case 'failed':
        return { 
          title: 'Analysis Failed', 
          description: analysis.progress?.error || 'An error occurred during analysis' 
        }
      default:
        return { 
          title: analysis.status, 
          description: `Current status: ${analysis.status}` 
        }
    }
  }

  const statusDisplay = getStatusDisplay()
  const canStart = analysis?.status === 'cost_approved' || analysis?.status === 'pending'
  const isProcessing = analysis?.status === 'processing'
  const isCompleted = analysis?.status === 'completed'
  const isFailed = analysis?.status === 'failed'

  return (
    <div className="min-h-screen bg-gray-950 dot-grid">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-4 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            <h1 className="text-3xl font-bold text-white mb-2">
              Analysis Execution
            </h1>
            <p className="text-gray-400">
              {statusDisplay.description}
            </p>
          </div>

          {/* Error State */}
          {error && (
            <Card className="border-red-800 bg-red-900/20 backdrop-blur mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Card */}
          <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                {isProcessing && <Loader2 className="h-5 w-5 animate-spin" />}
                {isCompleted && <CheckCircle className="h-5 w-5 text-green-400" />}
                {isFailed && <AlertCircle className="h-5 w-5 text-red-400" />}
                {statusDisplay.title}
              </CardTitle>
              <CardDescription>
                {analysis?.progress?.stage && `Current stage: ${analysis.progress.stage}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Analysis Details */}
              {analysis && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <span className="ml-2 text-white capitalize">{analysis.status.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Created:</span>
                    <span className="ml-2 text-white">
                      {new Date(analysis.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {analysis.estimatedCost && (
                    <div>
                      <span className="text-gray-400">Estimated Cost:</span>
                      <span className="ml-2 text-white">${analysis.estimatedCost.toFixed(2)}</span>
                    </div>
                  )}
                  {analysis.budgetLimit && (
                    <div>
                      <span className="text-gray-400">Budget Limit:</span>
                      <span className="ml-2 text-white">${analysis.budgetLimit.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Progress Bar */}
              {isProcessing && analysis?.progress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-white">{analysis.progress.percentage}%</span>
                  </div>
                  <Progress value={analysis.progress.percentage} className="w-full" />
                  
                  {/* Progress Details */}
                  <div className="text-sm text-gray-400">
                    {analysis.progress.message}
                  </div>
                  
                  {analysis.progress.totalPosts && (
                    <div className="text-sm text-gray-400">
                      {analysis.progress.processedPosts || 0} of {analysis.progress.totalPosts} posts processed
                    </div>
                  )}
                  
                  {analysis.progress.opportunitiesFound && (
                    <div className="text-sm text-green-400">
                      {analysis.progress.opportunitiesFound} opportunities found
                    </div>
                  )}
                </div>
              )}

              {/* Statistics for completed analysis */}
              {isCompleted && analysis?.statistics && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-green-900/20 border border-green-800 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{analysis.statistics.totalPosts}</div>
                    <div className="text-sm text-gray-400">Posts Analyzed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{analysis.statistics.opportunitiesFound}</div>
                    <div className="text-sm text-gray-400">Opportunities Found</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{analysis.statistics.conversionRate.toFixed(1)}%</div>
                    <div className="text-sm text-gray-400">Conversion Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{analysis.statistics.processingTimeMinutes}min</div>
                    <div className="text-sm text-gray-400">Processing Time</div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                {canStart && (
                  <Button
                    onClick={handleStartAnalysis}
                    disabled={isStarting}
                    className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  >
                    {isStarting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Start Analysis
                      </>
                    )}
                  </Button>
                )}

                {isCompleted && (
                  <Button
                    onClick={handleViewResults}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    View Results
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Back to Dashboard
                </Button>
              </div>

              {/* Real-time analysis info */}
              {canStart && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-sm text-blue-400">
                    <strong>Real-time Analysis:</strong> This will collect live data from Reddit and analyze it using AI. 
                    Processing typically takes 2-5 minutes depending on the amount of data.
                  </p>
                </div>
              )}

              {isProcessing && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <p className="text-sm text-yellow-400">
                    <strong>Processing:</strong> Live Reddit data is being collected and analyzed. 
                    You can safely leave this page and return later to check progress.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}