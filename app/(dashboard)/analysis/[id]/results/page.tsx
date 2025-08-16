'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  TrendingUp, 
  Users, 
  AlertCircle, 
  CheckCircle,
  ExternalLink,
  Download,
  Star,
  MessageSquare,
  Clock,
  Loader2
} from 'lucide-react'

// Types for real API data
interface SourcePost {
  id: string
  redditId: string
  subreddit: string
  title: string
  content: string
  score: number
  numComments: number
  createdUtc: string
  url: string
  permalink: string
}

interface Opportunity {
  id: string
  title: string
  problemStatement: string
  opportunityScore: number
  confidenceScore: number
  urgencyScore: number
  marketSignalsScore: number
  feasibilityScore: number
  classification: string
  evidence: string[]
  antiPatterns: string[] | null
  metadata: any
  createdAt: string
  sourcePost: SourcePost | null
}

interface AnalysisResults {
  analysis: {
    id: string
    status: string
    completedAt: string
    configuration: any
  }
  results: {
    opportunities: Opportunity[]
    redditPosts: SourcePost[]
    pagination: {
      total: number
      limit: number
      offset: number
      hasMore: boolean
    }
    statistics: {
      totalPosts: number
      totalOpportunities: number
      filteredOpportunities: number
      conversionRate: number
      avgOpportunityScore: number
    }
  }
}

export default function AnalysisResultsPage() {
  const router = useRouter()
  const params = useParams()
  const analysisId = params.id as string
  
  const [selectedOpp, setSelectedOpp] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<AnalysisResults | null>(null)

  useEffect(() => {
    const loadResults = async () => {
      try {
        setLoading(true)
        setError(null)

        // First check if analysis is completed
        const statusResponse = await fetch(`/api/analysis/${analysisId}/status`)
        if (!statusResponse.ok) {
          throw new Error('Failed to check analysis status')
        }

        const statusData = await statusResponse.json()
        if (!statusData.success) {
          throw new Error(statusData.error || 'Failed to load analysis status')
        }

        if (statusData.analysis.status !== 'completed') {
          // Analysis not completed yet, redirect to execute page
          router.push(`/analysis/${analysisId}/execute`)
          return
        }

        // Load the analysis results
        const resultsResponse = await fetch(`/api/analysis/${analysisId}/results`)
        if (!resultsResponse.ok) {
          throw new Error('Failed to load analysis results')
        }

        const resultsData = await resultsResponse.json()
        if (!resultsData.success) {
          throw new Error(resultsData.error || 'Failed to load results')
        }

        console.log('API Response:', resultsData) // Debug log
        console.log('Reddit Posts:', resultsData?.results?.redditPosts) // Debug Reddit posts specifically
        console.log('Opportunities:', resultsData?.results?.opportunities) // Debug opportunities
        setResults(resultsData)
      } catch (error) {
        console.error('Failed to load analysis results:', error)
        setError(error instanceof Error ? error.message : 'Failed to load analysis results')
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [analysisId, router])

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500'
    if (score >= 80) return 'text-yellow-500'
    if (score >= 70) return 'text-orange-500'
    return 'text-red-500'
  }

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-green-500/20 text-green-400 border-green-500/30'
    if (score >= 80) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    if (score >= 70) return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    return 'bg-red-500/20 text-red-400 border-red-500/30'
  }

  const extractKeyPhrases = (evidence: string[]): string[] => {
    // Extract key phrases from evidence - simplified version
    return evidence.slice(0, 4).map(e => e.substring(0, 30) + (e.length > 30 ? '...' : ''))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 dot-grid">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="mb-4 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500 mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">Loading Analysis Results</h2>
                <p className="text-gray-400">Please wait while we load your analysis...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 dot-grid">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="mb-4 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">Error Loading Results</h2>
                <p className="text-gray-400 mb-4">{error}</p>
                <Button
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!results) {
    return null
  }

  const { analysis, results: analysisResults } = results
  const opportunities = analysisResults.opportunities || []
  const redditPosts = analysisResults.redditPosts || []
  const stats = analysisResults.statistics
  
  // Show Reddit posts if no opportunities found, otherwise show opportunities
  const hasOpportunities = opportunities.length > 0
  const isRedditPosts = !hasOpportunities && redditPosts.length > 0
  const items = isRedditPosts ? redditPosts : opportunities
  
  // Debug logging
  console.log('Component Debug:', {
    opportunitiesCount: opportunities.length,
    redditPostsCount: redditPosts.length,
    hasOpportunities,
    isRedditPosts,
    itemsCount: items.length
  })

  return (
    <div className="min-h-screen bg-gray-950 dot-grid">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="mb-4 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Analysis Results
                </h1>
                <p className="text-gray-400">
                  {isRedditPosts 
                    ? "Reddit posts collected from analysis" 
                    : "SaaS opportunities identified from Reddit analysis"
                  }
                </p>
              </div>
              
              <Button
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">
                      {isRedditPosts ? "Posts Collected" : "Opportunities Found"}
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {isRedditPosts ? stats.totalPosts : stats.totalOpportunities}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">
                      {isRedditPosts ? "Filtered Posts" : "Posts Analyzed"}
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {isRedditPosts ? stats.filteredOpportunities : stats.totalPosts}
                    </p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Avg Score</p>
                    <p className="text-2xl font-bold text-white">{stats.avgOpportunityScore}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Conversion Rate</p>
                    <p className="text-2xl font-bold text-white">{stats.conversionRate.toFixed(1)}%</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Configuration Summary */}
          {analysis.configuration && (
            <Card className="border-gray-800 bg-gray-900/50 backdrop-blur mb-8">
              <CardHeader>
                <CardTitle className="text-white text-lg">Analysis Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Subreddits:</span>
                    <span className="ml-2 text-white">
                      {analysis.configuration.subreddits?.map((s: string) => `r/${s}`).join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Time Range:</span>
                    <span className="ml-2 text-white">{analysis.configuration.timeRange} days</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Keywords:</span>
                    <span className="ml-2 text-white">
                      {[...(analysis.configuration.keywords?.predefined || []), ...(analysis.configuration.keywords?.custom || [])].length} active
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results List */}
          <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">
                {isRedditPosts ? "Collected Reddit Posts" : "Top SaaS Opportunities"}
              </CardTitle>
              <CardDescription>
                {isRedditPosts 
                  ? "Sorted by Reddit score (upvotes)" 
                  : "Sorted by overall opportunity score"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-8 w-8 text-yellow-500 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {isRedditPosts ? "No Posts Found" : "No Opportunities Found"}
                  </h3>
                  <p className="text-gray-400">
                    {isRedditPosts 
                      ? "No Reddit posts were collected. Check your subreddit names and try again."
                      : "No SaaS opportunities were identified in the analyzed posts. Try adjusting your keywords or expanding the time range."
                    }
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-800 rounded-lg p-4 hover:bg-gray-800/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedOpp(selectedOpp === item.id ? null : item.id)}
                  >
                    {isRedditPosts ? (
                      // Reddit Post Display
                      <>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="text-white font-medium mb-1">{item.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span>r/{item.subreddit}</span>
                              <span className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {item.score} upvotes
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {item.numComments} comments
                              </span>
                            </div>
                          </div>
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 border">
                            {item.score}
                          </Badge>
                        </div>

                        {/* Expanded Details for Reddit Posts */}
                        {selectedOpp === item.id && (
                          <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                            <div>
                              <p className="text-sm text-gray-400 mb-2">Post Content:</p>
                              <p className="text-sm text-gray-300">
                                {item.content ? item.content.substring(0, 300) + (item.content.length > 300 ? '...' : '') : 'No content preview available'}
                              </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Check if permalink already includes the domain
                                  const url = item.permalink.startsWith('http') 
                                    ? item.permalink 
                                    : `https://reddit.com${item.permalink}`
                                  window.open(url, '_blank')
                                }}
                              >
                                <ExternalLink className="mr-2 h-3 w-3" />
                                View on Reddit
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      // Opportunity Display (keep existing logic)
                      <>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="text-white font-medium mb-1">{item.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span>r/{item.sourcePost?.subreddit}</span>
                              <span>•</span>
                              <span>{item.sourcePost?.numComments || 0} comments</span>
                              <span>•</span>
                              <span>Score: {item.sourcePost?.score || 0}</span>
                            </div>
                          </div>
                          <Badge className={`${getScoreBadgeColor(item.opportunityScore)} border`}>
                            Score: {item.opportunityScore}
                          </Badge>
                        </div>

                        {/* Score Breakdown */}
                        <div className="flex gap-6 mb-3">
                          <div className="text-sm">
                            <span className="text-gray-500">Urgency:</span>
                            <span className={`ml-2 font-medium ${getScoreColor(item.urgencyScore)}`}>
                              {item.urgencyScore}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500">Market:</span>
                            <span className={`ml-2 font-medium ${getScoreColor(item.marketSignalsScore)}`}>
                              {item.marketSignalsScore}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500">Feasibility:</span>
                            <span className={`ml-2 font-medium ${getScoreColor(item.feasibilityScore)}`}>
                              {item.feasibilityScore}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500">Confidence:</span>
                            <span className={`ml-2 font-medium ${getScoreColor(item.confidenceScore)}`}>
                              {item.confidenceScore}
                            </span>
                          </div>
                        </div>

                        {/* Expanded Details for Opportunities */}
                        {selectedOpp === item.id && (
                          <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                            <div>
                              <p className="text-sm text-gray-300">{item.problemStatement}</p>
                            </div>
                            
                            {item.evidence && item.evidence.length > 0 && (
                              <div>
                                <p className="text-sm text-gray-400 mb-2">Evidence:</p>
                                <div className="flex flex-wrap gap-2">
                                  {extractKeyPhrases(item.evidence).map((phrase, idx) => (
                                    <Badge key={idx} variant="secondary" className="bg-gray-800 text-gray-300">
                                      {phrase}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex gap-3 pt-2">
                              {item.sourcePost && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    window.open(item.sourcePost!.permalink, '_blank')
                                  }}
                                >
                                  <ExternalLink className="mr-2 h-3 w-3" />
                                  View on Reddit
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                              >
                                <Star className="mr-2 h-3 w-3" />
                                Save Opportunity
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Success Notice */}
          <div className="mt-8 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-green-400">
              <strong>✅ Real Data:</strong> {isRedditPosts 
                ? "This page shows live Reddit posts collected from real subreddits. Click on any post to view it on Reddit."
                : "This page shows live Reddit analysis results. All opportunities are generated from actual Reddit posts and AI processing."
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}