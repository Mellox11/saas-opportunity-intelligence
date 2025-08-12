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
  Clock
} from 'lucide-react'

// Simulated data for Epic 1 demonstration
const SAMPLE_OPPORTUNITIES = [
  {
    id: 1,
    title: "Developers struggling with API documentation management",
    subreddit: "r/webdev",
    score: 92,
    urgency: 85,
    marketSignals: 90,
    feasibility: 95,
    postUrl: "https://reddit.com/r/webdev/example1",
    author: "dev_user123",
    comments: 156,
    summary: "Multiple developers expressing frustration with keeping API docs in sync with code changes. Current tools are either too complex or lack automation.",
    keyPhrases: ["API documentation", "automation needed", "sync issues", "developer tools"]
  },
  {
    id: 2,
    title: "Small businesses need better inventory tracking for online/offline sales",
    subreddit: "r/smallbusiness",
    score: 88,
    urgency: 90,
    marketSignals: 85,
    feasibility: 88,
    postUrl: "https://reddit.com/r/smallbusiness/example2",
    author: "shop_owner",
    comments: 89,
    summary: "Shop owners struggling to sync inventory between physical store and multiple online channels. Existing solutions are enterprise-focused and expensive.",
    keyPhrases: ["inventory management", "multi-channel", "small business", "affordable solution"]
  },
  {
    id: 3,
    title: "Content creators want simplified video subtitle generation",
    subreddit: "r/ContentCreators",
    score: 85,
    urgency: 75,
    marketSignals: 88,
    feasibility: 92,
    postUrl: "https://reddit.com/r/ContentCreators/example3",
    author: "creator_pro",
    comments: 234,
    summary: "Many creators spending hours on subtitle creation and translation. AI tools exist but workflow integration is poor and pricing is confusing.",
    keyPhrases: ["subtitle generation", "video editing", "AI tools", "workflow automation"]
  },
  {
    id: 4,
    title: "Freelancers need better project time tracking with client reporting",
    subreddit: "r/freelance",
    score: 82,
    urgency: 80,
    marketSignals: 84,
    feasibility: 86,
    postUrl: "https://reddit.com/r/freelance/example4",
    author: "freelance_dev",
    comments: 67,
    summary: "Freelancers want time tracking that automatically generates professional client reports. Current tools focus on employee monitoring, not client transparency.",
    keyPhrases: ["time tracking", "client reports", "freelance tools", "billing automation"]
  },
  {
    id: 5,
    title: "React developers seeking better state management DevTools",
    subreddit: "r/reactjs",
    score: 78,
    urgency: 70,
    marketSignals: 82,
    feasibility: 85,
    postUrl: "https://reddit.com/r/reactjs/example5",
    author: "react_enthusiast",
    comments: 145,
    summary: "Developers finding Redux DevTools limiting for modern state management. Need better visualization and debugging for Zustand, Valtio, and other libraries.",
    keyPhrases: ["state management", "DevTools", "React", "debugging tools"]
  }
]

export default function AnalysisResultsPage() {
  const router = useRouter()
  const params = useParams()
  const analysisId = params.id as string
  
  const [selectedOpp, setSelectedOpp] = useState<number | null>(null)
  const [configuration, setConfiguration] = useState<any>(null)

  useEffect(() => {
    // Load the analysis configuration for display
    const loadAnalysis = async () => {
      try {
        const response = await fetch(`/api/analysis/${analysisId}`)
        if (response.ok) {
          const data = await response.json()
          setConfiguration(JSON.parse(data.configuration))
        }
      } catch (error) {
        console.error('Failed to load analysis:', error)
      }
    }
    loadAnalysis()
  }, [analysisId])

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
                  SaaS opportunities identified from Reddit analysis
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
                    <p className="text-sm text-gray-400">Opportunities Found</p>
                    <p className="text-2xl font-bold text-white">{SAMPLE_OPPORTUNITIES.length}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Posts Analyzed</p>
                    <p className="text-2xl font-bold text-white">342</p>
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
                    <p className="text-2xl font-bold text-white">85</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Analysis Time</p>
                    <p className="text-2xl font-bold text-white">4m 32s</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Configuration Summary */}
          {configuration && (
            <Card className="border-gray-800 bg-gray-900/50 backdrop-blur mb-8">
              <CardHeader>
                <CardTitle className="text-white text-lg">Analysis Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Subreddits:</span>
                    <span className="ml-2 text-white">
                      {configuration.subreddits?.map((s: string) => `r/${s}`).join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Time Range:</span>
                    <span className="ml-2 text-white">{configuration.timeRange} days</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Keywords:</span>
                    <span className="ml-2 text-white">
                      {[...(configuration.keywords?.predefined || []), ...(configuration.keywords?.custom || [])].length} active
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Opportunities List */}
          <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Top SaaS Opportunities</CardTitle>
              <CardDescription>
                Sorted by overall opportunity score
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {SAMPLE_OPPORTUNITIES.map((opp) => (
                <div
                  key={opp.id}
                  className="border border-gray-800 rounded-lg p-4 hover:bg-gray-800/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedOpp(selectedOpp === opp.id ? null : opp.id)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-white font-medium mb-1">{opp.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>{opp.subreddit}</span>
                        <span>•</span>
                        <span>{opp.comments} comments</span>
                        <span>•</span>
                        <span>by u/{opp.author}</span>
                      </div>
                    </div>
                    <Badge className={`${getScoreBadgeColor(opp.score)} border`}>
                      Score: {opp.score}
                    </Badge>
                  </div>

                  {/* Score Breakdown */}
                  <div className="flex gap-6 mb-3">
                    <div className="text-sm">
                      <span className="text-gray-500">Urgency:</span>
                      <span className={`ml-2 font-medium ${getScoreColor(opp.urgency)}`}>
                        {opp.urgency}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Market:</span>
                      <span className={`ml-2 font-medium ${getScoreColor(opp.marketSignals)}`}>
                        {opp.marketSignals}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Feasibility:</span>
                      <span className={`ml-2 font-medium ${getScoreColor(opp.feasibility)}`}>
                        {opp.feasibility}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedOpp === opp.id && (
                    <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                      <div>
                        <p className="text-sm text-gray-300">{opp.summary}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Key Phrases:</p>
                        <div className="flex flex-wrap gap-2">
                          {opp.keyPhrases.map((phrase, idx) => (
                            <Badge key={idx} variant="secondary" className="bg-gray-800 text-gray-300">
                              {phrase}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300 hover:bg-gray-800"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(opp.postUrl, '_blank')
                          }}
                        >
                          <ExternalLink className="mr-2 h-3 w-3" />
                          View on Reddit
                        </Button>
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
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Demo Notice */}
          <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-400">
              <strong>Epic 1 Demo:</strong> This results page shows simulated data for testing purposes. 
              In the full implementation, these results would come from actual Reddit analysis and AI processing.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}