'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ReportSharingService, PublicReportAccess } from '@/lib/services/report-sharing.service'
import { AppLogger } from '@/lib/observability/logger'

/**
 * Public Shared Report Access Page
 * AC: 8 - Public access to shared reports with password protection
 */

export default function SharedReportPage() {
  const params = useParams()
  const router = useRouter()
  const shareToken = params.token as string

  const [reportData, setReportData] = useState<PublicReportAccess | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    if (shareToken) {
      loadSharedReport()
    }
  }, [shareToken])

  const loadSharedReport = async (providedPassword?: string) => {
    try {
      setLoading(true)
      setError(null)
      setPasswordError(null)

      const response = await fetch(`/api/shared/reports/${shareToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: providedPassword || password,
          requestInfo: {
            userAgent: navigator.userAgent,
            referrer: document.referrer
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401 && data.error?.includes('Password required')) {
          setPasswordRequired(true)
          return
        }
        
        if (response.status === 401 && data.error?.includes('Invalid password')) {
          setPasswordError('Invalid password. Please try again.')
          return
        }

        throw new Error(data.error || 'Failed to load shared report')
      }

      setReportData(data.data)
      setPasswordRequired(false)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      AppLogger.error('Failed to load shared report', {
        component: 'shared-report-page',
        operation: 'load_shared_report_error',
        metadata: {
          shareToken,
          error: err instanceof Error ? err.message : 'Unknown error'
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.trim()) {
      loadSharedReport(password)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading shared report...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Report Unavailable
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {error}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    )
  }

  if (passwordRequired) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Password Required
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              This shared report is password protected. Please enter the password to continue.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setPasswordError(null)
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter password"
                required
              />
              {passwordError && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {passwordError}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verifying...' : 'Access Report'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {reportData.title}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Shared SaaS Opportunity Report
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Generated: {new Date(reportData.generatedAt).toLocaleDateString()}
              </p>
              {reportData.isLimited && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Limited view • Contact owner for full access
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Executive Summary
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {reportData.summary}
          </p>
        </div>

        {/* Opportunities */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Top SaaS Opportunities ({reportData.opportunities.length})
            </h2>
            {reportData.isLimited && (
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-xs font-medium rounded-full">
                Limited View
              </span>
            )}
          </div>

          <div className="space-y-4">
            {reportData.opportunities.map((opportunity, index) => (
              <div
                key={opportunity.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-semibold rounded">
                        {index + 1}
                      </span>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {opportunity.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                      <span>Score: {opportunity.score}</span>
                      <span className="capitalize">Category: {opportunity.category}</span>
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      opportunity.score >= 80 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : opportunity.score >= 60
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : opportunity.score >= 40
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {opportunity.score >= 80 ? 'High Potential' :
                       opportunity.score >= 60 ? 'Good Potential' :
                       opportunity.score >= 40 ? 'Moderate' : 'Low'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {reportData.isLimited && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Limited Access
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    This is a preview of the full report. Contact the report owner for complete access including detailed analysis, technical assessments, revenue estimates, and market insights.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                SaaS Opportunity Intelligence
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Advanced Reddit analysis for startup opportunity discovery
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}