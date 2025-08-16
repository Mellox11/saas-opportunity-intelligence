'use client'

import React, { useState } from 'react'
import { EnhancedReport } from '@/lib/types/report'
import { AppLogger } from '@/lib/observability/logger'

/**
 * PDF Export Button Component
 * AC: 5 - Professional PDF export with configurable options
 * AC: 6 - Interactive elements become static in PDF format
 */

interface PDFExportButtonProps {
  report: EnhancedReport
  type?: 'full' | 'summary' | 'opportunity'
  opportunityId?: string
  className?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function PDFExportButton({
  report,
  type = 'full',
  opportunityId,
  className = '',
  variant = 'primary',
  size = 'md'
}: PDFExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [exportOptions, setExportOptions] = useState({
    format: 'A4' as 'A4' | 'Letter',
    orientation: 'portrait' as 'portrait' | 'landscape',
    includeTOC: true,
    includePageNumbers: true,
    quality: 'standard' as 'standard' | 'high',
    topOpportunities: 5
  })

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
    
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    }
    
    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
      ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-800'
    }
    
    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`
  }

  const getTypeLabel = () => {
    switch (type) {
      case 'full': return 'Export Full Report'
      case 'summary': return 'Export Summary'
      case 'opportunity': return 'Export Opportunity'
      default: return 'Export PDF'
    }
  }

  const handleExport = async (useQuickExport: boolean = false) => {
    if (isExporting) return

    setIsExporting(true)
    setShowOptions(false)

    try {
      AppLogger.info('Starting PDF export', {
        component: 'pdf-export-button',
        operation: 'export_pdf',
        metadata: {
          reportId: report.id,
          type,
          opportunityId,
          options: useQuickExport ? { quick: true } : exportOptions
        }
      })

      // Build query parameters
      const params = new URLSearchParams({
        type,
        format: exportOptions.format,
        orientation: exportOptions.orientation,
        toc: exportOptions.includeTOC.toString(),
        pageNumbers: exportOptions.includePageNumbers.toString(),
        quality: exportOptions.quality,
        topOpportunities: exportOptions.topOpportunities.toString()
      })

      if (opportunityId) {
        params.append('opportunityId', opportunityId)
      }

      if (useQuickExport) {
        // Override with quick export defaults
        params.set('format', 'A4')
        params.set('orientation', 'portrait')
        params.set('quality', 'standard')
      }

      // Make request to PDF API
      const response = await fetch(`/api/reports/${report.id}/pdf?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      // Download the PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/)
      const filename = filenameMatch?.[1] || `saas-report-${report.id.slice(0, 8)}.pdf`
      
      // Create download link
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      AppLogger.info('PDF export completed', {
        component: 'pdf-export-button',
        operation: 'export_pdf_completed',
        metadata: {
          reportId: report.id,
          type,
          filename,
          pdfSizeBytes: blob.size
        }
      })

    } catch (error) {
      AppLogger.error('PDF export failed', {
        component: 'pdf-export-button',
        operation: 'export_pdf_error',
        metadata: {
          reportId: report.id,
          type,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      // Show error to user
      alert(`PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)

    } finally {
      setIsExporting(false)
    }
  }

  const handleQuickExport = () => handleExport(true)
  const handleCustomExport = () => handleExport(false)

  if (type === 'opportunity' && !opportunityId) {
    return null // Don't render if opportunity type but no ID provided
  }

  return (
    <div className="relative">
      {/* Main Export Button */}
      <div className="flex items-center">
        <button
          onClick={handleQuickExport}
          disabled={isExporting}
          className={getButtonClasses()}
        >
          {isExporting ? (
            <>
              <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Exporting...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {getTypeLabel()}
            </>
          )}
        </button>

        {/* Options Button */}
        {type !== 'opportunity' && (
          <button
            onClick={() => setShowOptions(!showOptions)}
            disabled={isExporting}
            className={`ml-1 px-2 py-2 text-sm font-medium rounded-r-lg border-l transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              variant === 'primary' 
                ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-500 focus:ring-blue-500'
                : variant === 'secondary'
                ? 'bg-gray-100 text-gray-900 hover:bg-gray-200 border-gray-300 focus:ring-gray-500 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:border-gray-600'
                : 'text-gray-700 hover:bg-gray-100 border-gray-300 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-800 dark:border-gray-600'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Export Options Panel */}
      {showOptions && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Export Options</h3>
              <button
                onClick={() => setShowOptions(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Page Format
              </label>
              <select
                value={exportOptions.format}
                onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as 'A4' | 'Letter' }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
              </select>
            </div>

            {/* Orientation Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Orientation
              </label>
              <select
                value={exportOptions.orientation}
                onChange={(e) => setExportOptions(prev => ({ ...prev, orientation: e.target.value as 'portrait' | 'landscape' }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            {/* Quality Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quality
              </label>
              <select
                value={exportOptions.quality}
                onChange={(e) => setExportOptions(prev => ({ ...prev, quality: e.target.value as 'standard' | 'high' }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="standard">Standard</option>
                <option value="high">High Quality</option>
              </select>
            </div>

            {/* Summary Options */}
            {type === 'summary' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Top Opportunities to Include
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={exportOptions.topOpportunities}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, topOpportunities: parseInt(e.target.value) || 5 }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* Checkboxes */}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.includeTOC}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeTOC: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">Include Table of Contents</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.includePageNumbers}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includePageNumbers: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">Include Page Numbers</span>
              </label>
            </div>

            {/* Export Button */}
            <button
              onClick={handleCustomExport}
              disabled={isExporting}
              className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? 'Exporting...' : 'Export with Options'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}