'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Plus, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  FileText,
  TrendingUp,
  Calendar
} from 'lucide-react'

interface Analysis {
  id: string
  status: string
  cost: number
  createdAt: string
  configuration: {
    name?: string
    subreddits: string[]
    timeRange: number
    keywords: {
      predefined: string[]
      custom: string[]
    }
  }
}

export default function AnalysisHistoryPage() {
  const router = useRouter()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        const response = await fetch('/api/analysis/list')
        if (response.ok) {
          const data = await response.json()
          setAnalyses(data.analyses || [])
        }
      } catch (error) {
        console.error('Failed to fetch analyses:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalyses()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'cost_approved':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: 'Completed', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      processing: { label: 'Processing', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      cost_approved: { label: 'Ready', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      pending: { label: 'Pending', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
      failed: { label: 'Failed', className: 'bg-red-500/20 text-red-400 border-red-500/30' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return (
      <Badge className={`${config.className} border`}>
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) {
      return 'Just now'
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const handleAnalysisClick = (analysis: Analysis) => {
    if (analysis.status === 'completed') {
      router.push(`/analysis/${analysis.id}/results`)
    } else if (analysis.status === 'cost_approved') {
      router.push(`/analysis/${analysis.id}/execute`)
    } else if (analysis.status === 'pending') {
      router.push(`/analysis/${analysis.id}/cost-estimation`)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Analysis History</h1>
          <p className="text-gray-400 mt-2">
            View and manage your Reddit analysis reports
          </p>
        </div>
        <Link href="/analysis/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            New Analysis
          </Button>
        </Link>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && analyses.length === 0 && (
        <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No analyses yet</h3>
            <p className="text-gray-400 text-sm mb-6">
              Start your first analysis to find SaaS opportunities
            </p>
            <Link href="/analysis/new">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Analysis
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Analyses List */}
      {!isLoading && analyses.length > 0 && (
        <div className="space-y-4">
          {analyses.map((analysis) => (
            <Card 
              key={analysis.id}
              className="border-gray-800 bg-gray-900/50 backdrop-blur hover:bg-gray-900/60 transition-colors cursor-pointer"
              onClick={() => handleAnalysisClick(analysis)}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start space-x-3">
                    {getStatusIcon(analysis.status)}
                    <div>
                      <h3 className="text-white font-medium mb-1">
                        {analysis.configuration.name || 'Untitled Analysis'}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(analysis.createdAt)}
                        </span>
                        <span className="flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          ${analysis.cost?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(analysis.status)}
                </div>

                {/* Configuration Summary */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Subreddits</p>
                    <p className="text-sm text-gray-300">
                      {analysis.configuration.subreddits.map(s => `r/${s}`).join(', ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Time Range</p>
                    <p className="text-sm text-gray-300">
                      {analysis.configuration.timeRange} days
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Keywords</p>
                    <p className="text-sm text-gray-300">
                      {[
                        ...(analysis.configuration.keywords?.predefined || []),
                        ...(analysis.configuration.keywords?.custom || [])
                      ].length} active
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-800">
                  {analysis.status === 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/analysis/${analysis.id}/results`)
                      }}
                      className="border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      <TrendingUp className="mr-2 h-3 w-3" />
                      View Results
                    </Button>
                  )}
                  {analysis.status === 'cost_approved' && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/analysis/${analysis.id}/execute`)
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <CheckCircle className="mr-2 h-3 w-3" />
                      Start Analysis
                    </Button>
                  )}
                  {analysis.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/analysis/${analysis.id}/cost-estimation`)
                      }}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      <DollarSign className="mr-2 h-3 w-3" />
                      Review Cost
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}