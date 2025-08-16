'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorBoundary, DataRenderBoundary } from '../../components/ui/error-boundary'
import { 
  sanitizeApiResponse,
  getSafePosts,
  getSafeFilteredPosts, 
  getSafeOpportunities,
  safeString,
  safeNumber
} from '../../utils/data-sanitizer'
import { TestResponse } from '../../types/test-api'

export default function TestRedditPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<TestResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const testRedditAPI = async () => {
    setIsLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/test/reddit-rss')
      const rawData = await response.json()

      if (!response.ok) {
        throw new Error(rawData.error || 'Failed to test Reddit API')
      }

      const sanitizedData = sanitizeApiResponse(rawData)
      if (!sanitizedData) {
        throw new Error('Invalid response format')
      }

      setResults(sanitizedData)
    } catch (err: any) {
      setError(safeString(err.message || 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  const testFullAnalysis = async () => {
    setIsLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/test/reddit-ai-pipeline')
      const rawData = await response.json()

      if (!response.ok) {
        throw new Error(rawData.error || 'Failed to run Reddit → AI pipeline')
      }

      const sanitizedData = sanitizeApiResponse(rawData)
      if (!sanitizedData) {
        throw new Error('Invalid response format')
      }

      setResults(sanitizedData)
    } catch (err: any) {
      setError(safeString(err.message || 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-950 dot-grid">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                🧪 Reddit API Testing
              </h1>
              <p className="text-gray-400">
                Test the Reddit data collection and AI analysis pipeline with real live data
              </p>
            </div>

            <div className="grid gap-6 mb-8">
              <DataRenderBoundary dataType="test controls">
                <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">Reddit Data Collection Test</CardTitle>
                    <CardDescription>
                      Fetch real posts from r/entrepreneur and test keyword filtering
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={testRedditAPI}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? 'Testing Reddit API...' : 'Test Reddit Data Collection'}
                    </Button>
                  </CardContent>
                </Card>
              </DataRenderBoundary>

              <DataRenderBoundary dataType="pipeline controls">
                <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">Reddit → AI Analysis Pipeline</CardTitle>
                    <CardDescription>
                      Test the complete flow: Reddit data collection → AI opportunity analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={testFullAnalysis}
                      disabled={isLoading}
                      className="w-full"
                      variant="outline"
                    >
                      {isLoading ? 'Running AI Analysis...' : 'Test Reddit → AI Pipeline'}
                    </Button>
                  </CardContent>
                </Card>
              </DataRenderBoundary>
            </div>

            {error && (
              <DataRenderBoundary dataType="error display">
                <Card className="border-red-800 bg-red-900/20 backdrop-blur mb-6">
                  <CardHeader>
                    <CardTitle className="text-red-400">❌ Error</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-red-300">{error}</p>
                  </CardContent>
                </Card>
              </DataRenderBoundary>
            )}

            {results && results.success && (
              <DataRenderBoundary dataType="results">
                <Card className="border-green-800 bg-green-900/20 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-green-400">✅ Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {results.data && (
                        <React.Fragment>
                          <DataRenderBoundary dataType="statistics">
                            <StatisticsSection data={results.data} />
                          </DataRenderBoundary>

                          <DataRenderBoundary dataType="reddit posts">
                            <RedditPostsSection data={results.data} />
                          </DataRenderBoundary>

                          <DataRenderBoundary dataType="filtered posts">
                            <FilteredPostsSection data={results.data} />
                          </DataRenderBoundary>

                          <DataRenderBoundary dataType="opportunities">
                            <OpportunitiesSection data={results.data} />
                          </DataRenderBoundary>

                          <DataRenderBoundary dataType="raw data">
                            <RawDataSection results={results} />
                          </DataRenderBoundary>
                        </React.Fragment>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </DataRenderBoundary>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}

// Safe Statistics Component
function StatisticsSection({ data }: { data: any }) {
  const totalPosts = safeNumber(data?.totalPosts || data?.pipeline?.redditPosts || 0)
  const filteredPosts = safeNumber(data?.filteredPosts || data?.pipeline?.filteredPosts || 0)
  const aiProcessed = safeNumber(data?.pipeline?.aiProcessed || 0)
  const opportunities = safeNumber(data?.opportunitiesFound || data?.pipeline?.opportunitiesFound || 0)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="text-center">
        <div className="text-2xl font-bold text-white">{totalPosts}</div>
        <div className="text-sm text-gray-400">Reddit Posts</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-white">{filteredPosts}</div>
        <div className="text-sm text-gray-400">Filtered Posts</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-white">{aiProcessed}</div>
        <div className="text-sm text-gray-400">AI Analyzed</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-white">{opportunities}</div>
        <div className="text-sm text-gray-400">Opportunities</div>
      </div>
    </div>
  )
}

// Safe Reddit Posts Component  
function RedditPostsSection({ data }: { data: any }) {
  const posts = getSafePosts(data)
  
  if (posts.length === 0) {
    return null
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-3">📄 Live Reddit Posts</h3>
      <div className="space-y-3">
        {posts.map((post, i) => (
          <div key={`post-${i}`} className="p-4 bg-gray-800/50 rounded-lg">
            <h4 className="font-medium text-white mb-1">{post.title}</h4>
            <div className="text-sm text-gray-400 space-x-4">
              <span>👍 {post.score}</span>
              <span>💬 {post.numComments}</span>  
              <span>📅 {post.created}</span>
            </div>
            <a 
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              View on Reddit →
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

// Safe Filtered Posts Component
function FilteredPostsSection({ data }: { data: any }) {
  const filteredPosts = getSafeFilteredPosts(data)
  
  if (filteredPosts.length === 0) {
    return null
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-3">🎯 Filtered Posts (Pain Points)</h3>
      <div className="space-y-3">
        {filteredPosts.map((post, i) => (
          <div key={`filtered-${i}`} className="p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
            <h4 className="font-medium text-white mb-1">{post.title}</h4>
            <div className="text-sm text-yellow-400 mb-2">
              Keywords found: {post.matchedKeywords || 'No keywords detected'}
            </div>
            <div className="text-sm text-gray-400">
              👍 {post.score}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Safe Opportunities Component
function OpportunitiesSection({ data }: { data: any }) {
  const opportunities = getSafeOpportunities(data)
  
  if (opportunities.length === 0) {
    return null
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-3">🚀 AI-Identified Opportunities</h3>
      <div className="space-y-4">
        {opportunities.map((opp, i) => (
          <div key={`opp-${i}`} className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-white flex-1">{opp.title}</h4>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-400">
                  {opp.opportunityScore}/100
                </div>
                <div className="text-sm text-gray-400">
                  {opp.confidenceScore}% confidence
                </div>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-3">{opp.problemStatement}</p>
            <div className="border-t border-gray-700 pt-3">
              <div className="text-sm text-gray-400">Source Post:</div>
              <div className="text-sm text-blue-400">{opp.sourceTitle}</div>
              <a 
                href={opp.sourcePermalink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                View Original →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Safe Raw Data Component
function RawDataSection({ results }: { results: TestResponse }) {
  return (
    <details className="mt-6">
      <summary className="text-sm text-gray-400 cursor-pointer">Raw JSON Response</summary>
      <pre className="mt-2 p-4 bg-gray-900 rounded-lg text-xs text-gray-300 overflow-x-auto">
        {JSON.stringify(results, null, 2)}
      </pre>
    </details>
  )
}