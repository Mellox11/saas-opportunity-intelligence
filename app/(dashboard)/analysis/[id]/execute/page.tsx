'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Play, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function ExecuteAnalysisPage() {
  const router = useRouter()
  const params = useParams()
  const analysisId = params.id as string

  const [status, setStatus] = useState('ready')
  const [progress, setProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState('Ready to start')
  const [error, setError] = useState<string | null>(null)

  const stages = [
    { name: 'Collecting Reddit Data', progress: 25 },
    { name: 'Filtering Posts', progress: 50 },
    { name: 'AI Analysis', progress: 75 },
    { name: 'Generating Results', progress: 100 }
  ]

  const handleStartAnalysis = async () => {
    setStatus('processing')
    setProgress(10)
    setCurrentStage('Starting analysis...')

    // For Epic 1, we'll show a simulation of the process
    // The actual Reddit scraping and AI analysis would be implemented here
    
    setTimeout(() => {
      setCurrentStage('Collecting Reddit Data')
      setProgress(25)
    }, 2000)

    setTimeout(() => {
      setCurrentStage('Filtering Posts')
      setProgress(50)
    }, 5000)

    setTimeout(() => {
      setCurrentStage('AI Analysis')
      setProgress(75)
    }, 8000)

    setTimeout(() => {
      setCurrentStage('Generating Results')
      setProgress(90)
    }, 11000)

    setTimeout(() => {
      setStatus('completed')
      setProgress(100)
      setCurrentStage('Analysis Complete!')
    }, 13000)
  }

  const handleViewResults = () => {
    router.push(`/analysis/${analysisId}/results`)
  }

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
              {status === 'ready' && 'Ready to start your Reddit analysis'}
              {status === 'processing' && 'Analyzing Reddit data for SaaS opportunities'}
              {status === 'completed' && 'Analysis complete! View your results below.'}
              {status === 'error' && 'An error occurred during analysis'}
            </p>
          </div>

          {/* Main Card */}
          <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">
                {status === 'ready' && 'Start Analysis'}
                {status === 'processing' && 'Processing...'}
                {status === 'completed' && 'Analysis Complete'}
                {status === 'error' && 'Analysis Failed'}
              </CardTitle>
              <CardDescription>
                {currentStage}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress Bar */}
              {(status === 'processing' || status === 'completed') && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-gray-400 text-right">{progress}% complete</p>
                </div>
              )}

              {/* Stage List */}
              {status === 'processing' && (
                <div className="space-y-3">
                  {stages.map((stage, index) => (
                    <div 
                      key={stage.name}
                      className={`flex items-center space-x-3 ${
                        progress >= stage.progress ? 'text-green-400' : 'text-gray-500'
                      }`}
                    >
                      {progress >= stage.progress ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : progress > (stages[index - 1]?.progress || 0) && progress < stage.progress ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-600" />
                      )}
                      <span className={progress >= stage.progress ? 'text-white' : 'text-gray-500'}>
                        {stage.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4">
                {status === 'ready' && (
                  <Button 
                    onClick={handleStartAnalysis}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Start Analysis
                  </Button>
                )}

                {status === 'completed' && (
                  <Button 
                    onClick={handleViewResults}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-5 w-5" />
                    View Results
                  </Button>
                )}

                {status === 'error' && (
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center space-x-2 text-red-400">
                      <AlertCircle className="h-5 w-5" />
                      <span>{error || 'An unexpected error occurred'}</span>
                    </div>
                    <Button 
                      onClick={handleStartAnalysis}
                      variant="outline"
                      className="border-gray-600"
                    >
                      Try Again
                    </Button>
                  </div>
                )}
              </div>

              {/* Info Box */}
              {status === 'ready' && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-sm text-blue-400">
                    <strong>Note:</strong> This is a demonstration of the Epic 1 analysis pipeline. 
                    The actual Reddit data collection and AI analysis features are simulated for testing purposes.
                  </p>
                </div>
              )}

              {status === 'processing' && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <p className="text-sm text-yellow-400">
                    <strong>Processing:</strong> Analysis typically takes 2-5 minutes depending on the amount of data.
                    You can safely leave this page and return later.
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