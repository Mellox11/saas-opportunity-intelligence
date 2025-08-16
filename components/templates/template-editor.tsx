'use client'

import React, { useState, useEffect } from 'react'
import { ReportTemplate, TemplateSection, TemplateBranding, TemplateFormatting } from '@/lib/services/report-template.service'
import { AppLogger } from '@/lib/observability/logger'

/**
 * Template Editor Component
 * AC: 9 - Visual template editor with section ordering and branding customization
 */

interface TemplateEditorProps {
  template?: ReportTemplate
  onSave: (template: Partial<ReportTemplate>) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function TemplateEditor({ template, onSave, onCancel, isLoading = false }: TemplateEditorProps) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    audience: template?.audience || 'business',
    description: template?.description || '',
    isPublic: template?.isPublic || false
  })

  const [sections, setSections] = useState<TemplateSection[]>(
    template?.sections || getDefaultSections()
  )

  const [styling, setStyling] = useState<TemplateBranding>(
    template?.styling || getDefaultStyling()
  )

  const [customizations, setCustomizations] = useState<TemplateFormatting>(
    template?.customizations || getDefaultCustomizations()
  )

  const [activeTab, setActiveTab] = useState<'sections' | 'styling' | 'customizations'>('sections')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required'
    }

    if (sections.length === 0) {
      newErrors.sections = 'At least one section is required'
    }

    const hasExecutiveSummary = sections.some(s => s.type === 'executive-summary' && s.included)
    if (!hasExecutiveSummary) {
      newErrors.sections = 'Executive summary section is required'
    }

    // Check for duplicate section orders
    const orders = sections.filter(s => s.included).map(s => s.order)
    const uniqueOrders = new Set(orders)
    if (orders.length !== uniqueOrders.size) {
      newErrors.sections = 'Section orders must be unique'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    try {
      const templateData = {
        name: formData.name,
        audience: formData.audience,
        description: formData.description,
        isPublic: formData.isPublic,
        sections: sections.map(s => ({ ...s, order: s.included ? s.order : 999 }))
          .sort((a, b) => a.order - b.order),
        styling,
        customizations
      }

      await onSave(templateData)

    } catch (error) {
      AppLogger.error('Failed to save template', {
        service: 'template-editor',
        operation: 'save_template_error',
        metadata: {
          templateId: template?.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  const handleSectionUpdate = (index: number, updates: Partial<TemplateSection>) => {
    setSections(prev => prev.map((section, i) => 
      i === index ? { ...section, ...updates } : section
    ))
  }

  const moveSectionUp = (index: number) => {
    if (index === 0) return
    
    setSections(prev => {
      const newSections = [...prev]
      const temp = newSections[index - 1].order
      newSections[index - 1].order = newSections[index].order
      newSections[index].order = temp
      return newSections.sort((a, b) => a.order - b.order)
    })
  }

  const moveSectionDown = (index: number) => {
    if (index === sections.length - 1) return
    
    setSections(prev => {
      const newSections = [...prev]
      const temp = newSections[index + 1].order
      newSections[index + 1].order = newSections[index].order
      newSections[index].order = temp
      return newSections.sort((a, b) => a.order - b.order)
    })
  }

  const renderSectionsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Report Sections
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Configure which sections to include in your reports and their order.
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section, index) => (
          <div key={section.type} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={section.included}
                  onChange={(e) => handleSectionUpdate(index, { included: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {section.name}
                  </h4>
                  {section.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {section.description}
                    </p>
                  )}
                </div>
              </div>
              
              {section.included && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={section.order}
                    onChange={(e) => handleSectionUpdate(index, { order: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm"
                  />
                  <button
                    onClick={() => moveSectionUp(index)}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveSectionDown(index)}
                    disabled={index === sections.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    ↓
                  </button>
                </div>
              )}
            </div>

            {section.included && (
              <div className="ml-7 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custom Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={section.settings.customTitle || ''}
                    onChange={(e) => handleSectionUpdate(index, {
                      settings: { ...section.settings, customTitle: e.target.value }
                    })}
                    placeholder={section.name}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>

                {section.type === 'opportunities' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Sort By
                      </label>
                      <select
                        value={section.settings.sortBy || 'score'}
                        onChange={(e) => handleSectionUpdate(index, {
                          settings: { ...section.settings, sortBy: e.target.value as any }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        <option value="score">Score</option>
                        <option value="date">Date</option>
                        <option value="category">Category</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Max Items
                      </label>
                      <input
                        type="number"
                        value={section.settings.maxItems || '50'}
                        onChange={(e) => handleSectionUpdate(index, {
                          settings: { ...section.settings, maxItems: parseInt(e.target.value) || 50 }
                        })}
                        min="1"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {errors.sections && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {errors.sections}
        </p>
      )}
    </div>
  )

  const renderStylingTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Report Styling
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Customize the visual appearance of your reports.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styling.primaryColor}
                onChange={(e) => setStyling(prev => ({ ...prev, primaryColor: e.target.value }))}
                className="w-12 h-8 border border-gray-300 dark:border-gray-600 rounded"
              />
              <input
                type="text"
                value={styling.primaryColor}
                onChange={(e) => setStyling(prev => ({ ...prev, primaryColor: e.target.value }))}
                placeholder="#3b82f6"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Secondary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styling.secondaryColor}
                onChange={(e) => setStyling(prev => ({ ...prev, secondaryColor: e.target.value }))}
                className="w-12 h-8 border border-gray-300 dark:border-gray-600 rounded"
              />
              <input
                type="text"
                value={styling.secondaryColor}
                onChange={(e) => setStyling(prev => ({ ...prev, secondaryColor: e.target.value }))}
                placeholder="#6366f1"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Company Name
          </label>
          <input
            type="text"
            value={styling.companyName || ''}
            onChange={(e) => setStyling(prev => ({ ...prev, companyName: e.target.value }))}
            placeholder="Your Company Name"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Font Family
          </label>
          <select
            value={styling.fontFamily}
            onChange={(e) => setStyling(prev => ({ ...prev, fontFamily: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="system">System Font</option>
            <option value="serif">Serif</option>
            <option value="mono">Monospace</option>
          </select>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={styling.showDotPattern}
            onChange={(e) => setStyling(prev => ({ ...prev, showDotPattern: e.target.checked }))}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Show dot grid pattern background
          </label>
        </div>
      </div>
    </div>
  )

  const renderCustomizationsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Page Customizations
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Configure page layout and formatting options.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Page Size
            </label>
            <select
              value={customizations.pageSize}
              onChange={(e) => setCustomizations(prev => ({ ...prev, pageSize: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
              <option value="Legal">Legal</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Orientation
            </label>
            <select
              value={customizations.orientation}
              onChange={(e) => setCustomizations(prev => ({ ...prev, orientation: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Spacing
          </label>
          <select
            value={customizations.spacing}
            onChange={(e) => setCustomizations(prev => ({ ...prev, spacing: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="compact">Compact</option>
            <option value="normal">Normal</option>
            <option value="relaxed">Relaxed</option>
          </select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={customizations.showPageNumbers}
              onChange={(e) => setCustomizations(prev => ({ ...prev, showPageNumbers: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Show page numbers
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={customizations.showTableOfContents}
              onChange={(e) => setCustomizations(prev => ({ ...prev, showTableOfContents: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Include table of contents
            </label>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {template ? 'Edit Template' : 'Create New Template'}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Template Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter template name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.name}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Audience
            </label>
            <select
              value={formData.audience}
              onChange={(e) => setFormData(prev => ({ ...prev, audience: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="business">Business</option>
              <option value="technical">Technical</option>
              <option value="investor">Investor</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe this template's purpose and use case"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isPublic}
              onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Make this template public (other users can use it)
            </label>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'sections', label: 'Sections' },
            { id: 'styling', label: 'Styling' },
            { id: 'customizations', label: 'Formatting' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'sections' && renderSectionsTab()}
        {activeTab === 'styling' && renderStylingTab()}
        {activeTab === 'customizations' && renderCustomizationsTab()}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Saving...' : 'Save Template'}
        </button>
      </div>
    </div>
  )
}

// Helper functions

function getDefaultSections(): TemplateSection[] {
  return [
    {
      type: 'executive-summary',
      name: 'Executive Summary',
      description: 'Key insights and recommendations',
      included: true,
      order: 1,
      settings: { showMetrics: true }
    },
    {
      type: 'opportunities',
      name: 'SaaS Opportunities',
      description: 'Detailed opportunity analysis',
      included: true,
      order: 2,
      settings: { sortBy: 'score', maxItems: 50, expandByDefault: false }
    },
    {
      type: 'market-analysis',
      name: 'Market Analysis',
      description: 'Market trends and persona insights',
      included: true,
      order: 3,
      settings: { chartType: 'bar', showMetrics: true }
    },
    {
      type: 'methodology',
      name: 'Methodology',
      description: 'Analysis process and data sources',
      included: true,
      order: 4,
      settings: {}
    }
  ]
}

function getDefaultStyling(): TemplateBranding {
  return {
    primaryColor: '#3b82f6',
    secondaryColor: '#6366f1',
    companyName: 'SaaS Opportunity Intelligence',
    showDotPattern: true,
    fontFamily: 'system'
  }
}

function getDefaultCustomizations(): TemplateFormatting {
  return {
    pageSize: 'A4',
    orientation: 'portrait',
    margins: { top: 72, right: 54, bottom: 72, left: 54 },
    spacing: 'normal',
    showPageNumbers: true,
    showTableOfContents: true,
    headerHeight: 60,
    footerHeight: 40
  }
}