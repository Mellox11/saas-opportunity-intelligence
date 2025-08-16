'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ExternalLink, 
  Copy, 
  MessageSquare, 
  Calendar, 
  TrendingUp,
  User,
  ChevronRight,
  Loader2,
  AlertCircle,
  Check
} from 'lucide-react'

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

interface PostDetailPanelProps {
  post: SourcePost | null
  isLoading?: boolean
  error?: string | null
  className?: string
}

export function PostDetailPanel({ post, isLoading, error, className }: PostDetailPanelProps) {
  const [copySuccess, setCopySuccess] = useState(false)

  const formatDate = (utcString: string) => {
    try {
      const date = new Date(utcString)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Unknown date'
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const formatPostContent = (content: string) => {
    if (!content || content.length === 0) return 'No content available'
    
    // Handle Reddit's common content patterns
    const formatted = content
      .replace(/\n\n/g, '\n') // Reduce excessive line breaks
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      .slice(0, 2000) // Limit content length
    
    return formatted
  }

  if (isLoading) {
    return (
      <div className={`h-full bg-gray-900/50 backdrop-blur border border-gray-800 rounded-lg ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-500 mb-3" />
            <p className="text-sm text-gray-400">Loading post details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`h-full bg-gray-900/50 backdrop-blur border border-gray-800 rounded-lg ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="mx-auto h-6 w-6 text-red-500 mb-3" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className={`h-full bg-gray-900/50 backdrop-blur border border-gray-800 rounded-lg ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-sm">
            <MessageSquare className="mx-auto h-8 w-8 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Select an Opportunity</h3>
            <p className="text-sm text-gray-400">
              Click on any opportunity to view the source Reddit post that generated it.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const redditUrl = `https://reddit.com${post.permalink}`

  return (
    <Card className={`h-full bg-gray-900/50 backdrop-blur border-gray-800 flex flex-col ${className}`}>
      {/* Header */}
      <CardHeader className="border-b border-gray-800 flex-shrink-0">
        <div className="space-y-3">
          {/* Subreddit and metadata */}
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className="bg-blue-500/20 text-blue-400 border-blue-500/30"
            >
              r/{post.subreddit}
            </Badge>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-400">{formatDate(post.createdUtc)}</span>
          </div>

          {/* Title */}
          <h2 className="text-lg font-semibold text-white leading-tight">
            {post.title}
          </h2>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-orange-400">
              <TrendingUp className="h-4 w-4" />
              <span>{post.score} upvotes</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-400">
              <MessageSquare className="h-4 w-4" />
              <span>{post.numComments} comments</span>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {/* Post Content */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Post Content</h3>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                {formatPostContent(post.content)}
              </p>
              {post.content.length > 2000 && (
                <p className="text-xs text-gray-500 mt-2 italic">Content truncated...</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300">Actions</h3>
            <div className="space-y-2">
              <Button
                onClick={() => window.open(redditUrl, '_blank')}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Full Post on Reddit
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.open(`${redditUrl}?sort=top`, '_blank')}
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                View Comments on Reddit
              </Button>

              <Button
                variant="outline"
                onClick={() => copyToClipboard(redditUrl)}
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                {copySuccess ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Reddit Link
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Technical Details */}
          <div className="pt-4 border-t border-gray-800">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Post Details</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Reddit ID:</span>
                <span className="text-gray-400 font-mono">{post.redditId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Score:</span>
                <span className="text-gray-400">{post.score}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Comments:</span>
                <span className="text-gray-400">{post.numComments}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}