'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    opportunitiesFound: 0,
    totalSpent: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch user's analyses
        const response = await fetch('/api/analysis/stats')
        if (response.ok) {
          const data = await response.json()
          setStats({
            totalAnalyses: data.totalAnalyses || 0,
            opportunitiesFound: data.opportunitiesFound || 0,
            totalSpent: data.totalSpent || 0
          })
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400 mt-2">
          Welcome to your SaaS Opportunity Intelligence dashboard
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm hover:bg-zinc-900/30 transition-all duration-200">
          <CardHeader>
            <CardTitle className="text-lg text-white">Total Analyses</CardTitle>
            <CardDescription className="text-zinc-400">Your analysis history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {isLoading ? '...' : stats.totalAnalyses}
            </div>
            <p className="text-zinc-500 text-sm mt-1">
              {stats.totalAnalyses === 0 ? 'No analyses yet' : `${stats.totalAnalyses} completed`}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm hover:bg-zinc-900/30 transition-all duration-200">
          <CardHeader>
            <CardTitle className="text-lg text-white">Opportunities Found</CardTitle>
            <CardDescription className="text-zinc-400">SaaS opportunities identified</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {isLoading ? '...' : stats.opportunitiesFound}
            </div>
            <p className="text-zinc-500 text-sm mt-1">
              {stats.opportunitiesFound === 0 ? 'Start your first analysis' : 'SaaS opportunities identified'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm hover:bg-zinc-900/30 transition-all duration-200">
          <CardHeader>
            <CardTitle className="text-lg text-white">Total Spent</CardTitle>
            <CardDescription className="text-zinc-400">Analysis costs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              ${isLoading ? '...' : stats.totalSpent.toFixed(2)}
            </div>
            <p className="text-zinc-500 text-sm mt-1">
              {stats.totalSpent === 0 ? 'No charges yet' : 'Total analysis costs'}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm hover:bg-zinc-900/30 transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-white">Getting Started</CardTitle>
          <CardDescription className="text-zinc-400">Start identifying SaaS opportunities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-6 bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-xl backdrop-blur-sm">
            <h3 className="font-semibold mb-3 text-white">Ready to begin?</h3>
            <p className="text-zinc-300 text-sm mb-6">
              Your Epic 1 system is ready! Start analyzing Reddit data to find SaaS opportunities.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Link href="/analysis/new">
                <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white border-0">
                  🚀 Start New Analysis
                </Button>
              </Link>
              <Link href="/analysis">
                <Button variant="outline" className="w-full sm:w-auto border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                  📊 View Analysis History
                </Button>
              </Link>
            </div>
            
            <div className="text-sm text-zinc-400 space-y-2">
              <p className="font-medium text-zinc-300">Epic 1 Features Available:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <p className="flex items-center"><span className="text-green-400 mr-2">✅</span> User authentication & management</p>
                <p className="flex items-center"><span className="text-green-400 mr-2">✅</span> Reddit data collection & configuration</p>
                <p className="flex items-center"><span className="text-green-400 mr-2">✅</span> Cost estimation & budget approval</p>
                <p className="flex items-center"><span className="text-green-400 mr-2">✅</span> AI analysis pipeline with progress tracking</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}