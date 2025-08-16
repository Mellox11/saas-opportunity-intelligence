import puppeteer, { Browser, Page } from 'puppeteer'
import { EnhancedReport } from '@/lib/types/report'
import { AppLogger } from '@/lib/observability/logger'
import { CostTrackingService } from '@/lib/services/cost-tracking.service'
import { calculateEventCost } from '@/lib/utils/cost-calculator'

/**
 * PDF Generation Service for Enhanced Reports
 * AC: 5 - Professional PDF export with table of contents and Mercury.com branding
 * AC: 6 - Interactive elements become static in PDF format
 */
export class PDFGenerationService {
  private browser: Browser | null = null
  private costTrackingService: CostTrackingService | null

  constructor(private analysisId?: string, skipCostTracking: boolean = false) {
    this.costTrackingService = skipCostTracking ? null : new CostTrackingService()
  }

  /**
   * Generate PDF from enhanced report
   */
  async generateReportPDF(
    report: EnhancedReport,
    options: {
      includeTableOfContents?: boolean
      includePageNumbers?: boolean
      format?: 'A4' | 'Letter'
      orientation?: 'portrait' | 'landscape'
      quality?: 'standard' | 'high'
      watermark?: string
    } = {}
  ): Promise<Buffer> {
    const startTime = Date.now()

    try {
      AppLogger.info('Starting PDF generation', {
        service: 'pdf-generation',
        operation: 'generate_report_pdf',
        metadata: {
          analysisId: this.analysisId,
          reportId: report.id,
          options
        }
      })

      // Initialize browser
      await this.initializeBrowser()
      
      // Generate report HTML
      const reportHTML = await this.generateReportHTML(report, options)
      
      // Create PDF
      const pdfBuffer = await this.createPDFFromHTML(reportHTML, options)
      
      const processingTime = Date.now() - startTime
      await this.trackPDFCosts(processingTime, 'report_pdf')

      AppLogger.info('PDF generation completed', {
        service: 'pdf-generation',
        operation: 'generate_report_pdf_completed',
        metadata: {
          analysisId: this.analysisId,
          reportId: report.id,
          processingTimeMs: processingTime,
          pdfSizeBytes: pdfBuffer.length
        }
      })

      return pdfBuffer

    } catch (error) {
      const processingTime = Date.now() - startTime
      
      AppLogger.error('PDF generation failed', {
        service: 'pdf-generation',
        operation: 'generate_report_pdf_error',
        metadata: {
          analysisId: this.analysisId,
          reportId: report.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTimeMs: processingTime
        }
      })

      throw error
    } finally {
      await this.cleanup()
    }
  }

  /**
   * Generate summary PDF for quick overview
   */
  async generateSummaryPDF(
    report: EnhancedReport,
    options: {
      includeTopOpportunities?: number // Number of top opportunities to include
      format?: 'A4' | 'Letter'
    } = {}
  ): Promise<Buffer> {
    const startTime = Date.now()

    try {
      AppLogger.info('Starting summary PDF generation', {
        service: 'pdf-generation',
        operation: 'generate_summary_pdf',
        metadata: {
          analysisId: this.analysisId,
          reportId: report.id,
          topOpportunities: options.includeTopOpportunities || 5
        }
      })

      await this.initializeBrowser()
      
      // Generate summary HTML (executive summary + top opportunities)
      const summaryHTML = await this.generateSummaryHTML(report, options)
      
      const pdfBuffer = await this.createPDFFromHTML(summaryHTML, {
        format: options.format || 'A4',
        orientation: 'portrait',
        quality: 'standard'
      })
      
      const processingTime = Date.now() - startTime
      await this.trackPDFCosts(processingTime, 'summary_pdf')

      return pdfBuffer

    } catch (error) {
      AppLogger.error('Summary PDF generation failed', {
        service: 'pdf-generation',
        operation: 'generate_summary_pdf_error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      throw error
    } finally {
      await this.cleanup()
    }
  }

  /**
   * Generate opportunity-specific PDF
   */
  async generateOpportunityPDF(
    report: EnhancedReport,
    opportunityId: string,
    options: { format?: 'A4' | 'Letter' } = {}
  ): Promise<Buffer> {
    const opportunity = report.opportunities.find(opp => opp.id === opportunityId)
    if (!opportunity) {
      throw new Error(`Opportunity ${opportunityId} not found in report`)
    }

    const startTime = Date.now()

    try {
      await this.initializeBrowser()
      
      const opportunityHTML = await this.generateOpportunityHTML(opportunity, report.metadata)
      
      const pdfBuffer = await this.createPDFFromHTML(opportunityHTML, {
        format: options.format || 'A4',
        orientation: 'portrait',
        quality: 'standard'
      })
      
      const processingTime = Date.now() - startTime
      await this.trackPDFCosts(processingTime, 'opportunity_pdf')

      return pdfBuffer

    } catch (error) {
      AppLogger.error('Opportunity PDF generation failed', {
        service: 'pdf-generation',
        operation: 'generate_opportunity_pdf_error',
        metadata: {
          opportunityId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      throw error
    } finally {
      await this.cleanup()
    }
  }

  // Private methods

  private async initializeBrowser(): Promise<void> {
    if (this.browser) return

    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    })
  }

  private async generateReportHTML(
    report: EnhancedReport,
    options: any
  ): Promise<string> {
    // Generate complete report HTML for PDF
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SaaS Opportunity Report - ${report.id}</title>
  <style>
    ${this.getPDFStyles()}
  </style>
</head>
<body>
  ${options.includeTableOfContents ? this.generateTableOfContents(report) : ''}
  
  <!-- Report Header -->
  ${this.generatePDFHeader(report, options)}
  
  <!-- Executive Summary -->
  ${this.generateExecutiveSummaryHTML(report)}
  
  <!-- Opportunities Section -->
  ${this.generateOpportunitiesHTML(report)}
  
  <!-- Market Analysis -->
  ${this.generateMarketAnalysisHTML(report)}
  
  <!-- Methodology -->
  ${this.generateMethodologyHTML(report)}
  
  <!-- Footer -->
  ${this.generatePDFFooter(report, options)}
</body>
</html>`
  }

  private async generateSummaryHTML(
    report: EnhancedReport,
    options: any
  ): Promise<string> {
    const topOpportunities = report.opportunities
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, options.includeTopOpportunities || 5)

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SaaS Opportunity Summary - ${report.id}</title>
  <style>
    ${this.getPDFStyles()}
  </style>
</head>
<body>
  ${this.generatePDFHeader(report, { summary: true })}
  ${this.generateExecutiveSummaryHTML(report)}
  ${this.generateTopOpportunitiesHTML(topOpportunities)}
  ${this.generatePDFFooter(report, { summary: true })}
</body>
</html>`
  }

  private async generateOpportunityHTML(
    opportunity: any,
    metadata: any
  ): Promise<string> {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Opportunity Analysis - ${opportunity.title}</title>
  <style>
    ${this.getPDFStyles()}
  </style>
</head>
<body>
  ${this.generateOpportunityDetailHTML(opportunity, metadata)}
</body>
</html>`
  }

  private getPDFStyles(): string {
    return `
      /* PDF-optimized styles based on Mercury.com branding */
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        font-size: 12pt;
        line-height: 1.6;
        color: #1f2937;
        background: white;
      }
      
      .page-break {
        page-break-before: always;
      }
      
      .no-break {
        page-break-inside: avoid;
      }
      
      /* Headers */
      h1 {
        font-size: 24pt;
        font-weight: 700;
        margin-bottom: 16pt;
        color: #111827;
      }
      
      h2 {
        font-size: 18pt;
        font-weight: 600;
        margin: 24pt 0 12pt 0;
        color: #374151;
        border-bottom: 2pt solid #e5e7eb;
        padding-bottom: 8pt;
      }
      
      h3 {
        font-size: 14pt;
        font-weight: 600;
        margin: 16pt 0 8pt 0;
        color: #4b5563;
      }
      
      /* Content sections */
      .report-section {
        margin-bottom: 32pt;
        page-break-inside: avoid;
      }
      
      .metric-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150pt, 1fr));
        gap: 16pt;
        margin: 16pt 0;
      }
      
      .metric-card {
        border: 1pt solid #e5e7eb;
        border-radius: 4pt;
        padding: 12pt;
        background: #f9fafb;
      }
      
      .metric-label {
        font-size: 9pt;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5pt;
        margin-bottom: 4pt;
      }
      
      .metric-value {
        font-size: 18pt;
        font-weight: 700;
        color: #111827;
      }
      
      /* Opportunity cards */
      .opportunity-card {
        border: 1pt solid #e5e7eb;
        border-radius: 4pt;
        padding: 16pt;
        margin-bottom: 16pt;
        page-break-inside: avoid;
      }
      
      .opportunity-header {
        margin-bottom: 12pt;
        padding-bottom: 8pt;
        border-bottom: 1pt solid #e5e7eb;
      }
      
      .opportunity-title {
        font-size: 16pt;
        font-weight: 600;
        color: #111827;
        margin-bottom: 4pt;
      }
      
      .opportunity-score {
        display: inline-block;
        background: #3b82f6;
        color: white;
        padding: 2pt 8pt;
        border-radius: 12pt;
        font-size: 10pt;
        font-weight: 600;
      }
      
      /* Lists */
      ul {
        margin: 8pt 0;
        padding-left: 16pt;
      }
      
      li {
        margin-bottom: 4pt;
      }
      
      /* Tables */
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 12pt 0;
      }
      
      th, td {
        border: 1pt solid #e5e7eb;
        padding: 8pt;
        text-align: left;
      }
      
      th {
        background: #f3f4f6;
        font-weight: 600;
      }
      
      /* Header and footer */
      .report-header {
        margin-bottom: 24pt;
        padding-bottom: 16pt;
        border-bottom: 2pt solid #e5e7eb;
      }
      
      .report-footer {
        margin-top: 24pt;
        padding-top: 16pt;
        border-top: 1pt solid #e5e7eb;
        font-size: 10pt;
        color: #6b7280;
      }
      
      /* Table of contents */
      .toc {
        page-break-after: always;
        margin-bottom: 24pt;
      }
      
      .toc-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4pt;
        border-bottom: 1pt dotted #d1d5db;
        padding-bottom: 2pt;
      }
      
      /* Print-specific */
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .page-break {
          page-break-before: always;
        }
        
        .no-break {
          page-break-inside: avoid;
        }
      }
      
      /* Dot grid pattern for branding */
      .dot-pattern {
        background-image: radial-gradient(circle, #e5e7eb 1pt, transparent 1pt);
        background-size: 20pt 20pt;
        opacity: 0.3;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -1;
      }
    `
  }

  private generateTableOfContents(report: EnhancedReport): string {
    const sections = report.template.sections.filter(s => s.included)
    
    return `
    <div class="toc page-break">
      <h1>Table of Contents</h1>
      ${sections.map((section, index) => `
        <div class="toc-item">
          <span>${index + 1}. ${this.getSectionTitle(section.type)}</span>
          <span>${index + 2}</span>
        </div>
      `).join('')}
    </div>`
  }

  private generatePDFHeader(report: EnhancedReport, options: any): string {
    return `
    <div class="report-header">
      <div class="dot-pattern"></div>
      <h1>SaaS Opportunity Intelligence Report</h1>
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-label">Report ID</div>
          <div class="metric-value">${report.id.slice(0, 8)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Generated</div>
          <div class="metric-value">${new Date(report.metadata.generatedAt).toLocaleDateString()}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Opportunities</div>
          <div class="metric-value">${report.opportunities.length}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Confidence</div>
          <div class="metric-value">${Math.round(report.metadata.accuracyConfidence * 100)}%</div>
        </div>
      </div>
    </div>`
  }

  private generateExecutiveSummaryHTML(report: EnhancedReport): string {
    return `
    <div class="report-section no-break">
      <h2>Executive Summary</h2>
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-label">Total Opportunities</div>
          <div class="metric-value">${report.executiveSummary.totalOpportunities}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Average Score</div>
          <div class="metric-value">${report.executiveSummary.averageOpportunityScore}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Processing Time</div>
          <div class="metric-value">${Math.round(report.executiveSummary.processingMetrics.analysisTimeMs / 1000)}s</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Total Cost</div>
          <div class="metric-value">$${report.executiveSummary.processingMetrics.totalCost.toFixed(2)}</div>
        </div>
      </div>
      
      <h3>Key Findings</h3>
      <ul>
        ${report.executiveSummary.keyFindings.map(finding => `<li>${finding}</li>`).join('')}
      </ul>
      
      <h3>Recommended Actions</h3>
      <ul>
        ${report.executiveSummary.recommendedActions.map(action => `<li>${action}</li>`).join('')}
      </ul>
    </div>`
  }

  private generateOpportunitiesHTML(report: EnhancedReport): string {
    const sortedOpportunities = report.opportunities
      .sort((a, b) => b.opportunityScore - a.opportunityScore)

    return `
    <div class="report-section page-break">
      <h2>SaaS Opportunities (${report.opportunities.length})</h2>
      ${sortedOpportunities.map((opp, index) => this.generateOpportunityCardHTML(opp, index + 1)).join('')}
    </div>`
  }

  private generateOpportunityCardHTML(opportunity: any, rank: number): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount)
    }

    return `
    <div class="opportunity-card">
      <div class="opportunity-header">
        <div class="opportunity-title">#${rank} ${opportunity.title}</div>
        <span class="opportunity-score">Score: ${opportunity.opportunityScore}</span>
      </div>
      
      <p><strong>Problem:</strong> ${opportunity.problemStatement}</p>
      
      <h4>Revenue Estimate</h4>
      <p>${formatCurrency(opportunity.revenueEstimate.annualRevenueMin)} - ${formatCurrency(opportunity.revenueEstimate.annualRevenueMax)} annually</p>
      <p><strong>Pricing Model:</strong> ${opportunity.revenueEstimate.pricingModel}</p>
      
      <h4>Suggested Solution</h4>
      <p><strong>${opportunity.suggestedSolution.productName}</strong> - ${opportunity.suggestedSolution.tagline}</p>
      <p>${opportunity.suggestedSolution.differentiationStrategy}</p>
      
      <h4>Core Features</h4>
      <ul>
        ${opportunity.suggestedSolution.coreFeatures.map((feature: string) => `<li>${feature}</li>`).join('')}
      </ul>
      
      <h4>Implementation</h4>
      <p><strong>Complexity:</strong> ${opportunity.technicalAssessment.implementationComplexity}/10</p>
      <p><strong>Timeline:</strong> ${opportunity.technicalAssessment.developmentTimeEstimate}</p>
    </div>`
  }

  private generateMarketAnalysisHTML(report: EnhancedReport): string {
    return `
    <div class="report-section page-break">
      <h2>Market Analysis</h2>
      
      <h3>Market Maturity</h3>
      <p>${report.marketAnalysis.marketMaturity}</p>
      
      <h3>Trending Topics</h3>
      <table>
        <thead>
          <tr>
            <th>Topic</th>
            <th>Frequency</th>
            <th>Score</th>
            <th>Growth</th>
          </tr>
        </thead>
        <tbody>
          ${report.marketAnalysis.trendingTopics.slice(0, 10).map(topic => `
            <tr>
              <td>${topic.topic}</td>
              <td>${topic.frequency}</td>
              <td>${topic.score}</td>
              <td>${topic.growth > 0 ? '+' : ''}${topic.growth}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <h3>Persona Distribution</h3>
      <table>
        <thead>
          <tr>
            <th>Persona</th>
            <th>Count</th>
            <th>Percentage</th>
            <th>Avg Score</th>
          </tr>
        </thead>
        <tbody>
          ${report.marketAnalysis.personaDistribution.map(persona => `
            <tr>
              <td>${persona.persona.replace(/-/g, ' ')}</td>
              <td>${persona.count}</td>
              <td>${persona.percentage}%</td>
              <td>${persona.avgScore}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`
  }

  private generateMethodologyHTML(report: EnhancedReport): string {
    return `
    <div class="report-section page-break">
      <h2>Methodology</h2>
      
      <h3>Data Sources</h3>
      <ul>
        <li>Reddit posts from ${report.metadata.analysisConfiguration.subreddits.length} subreddits</li>
        <li>${report.metadata.dataSourceSummary.totalPosts} posts and ${report.metadata.dataSourceSummary.totalComments} comments analyzed</li>
        <li>Date range: ${report.metadata.dataSourceSummary.dateRange.start.toLocaleDateString()} - ${report.metadata.dataSourceSummary.dateRange.end.toLocaleDateString()}</li>
      </ul>
      
      <h3>Analysis Process</h3>
      <ul>
        <li>AI-powered opportunity classification using GPT-4</li>
        <li>10-dimensional scoring across persona, market, and technical factors</li>
        <li>Comment sentiment analysis for community validation</li>
        <li>Revenue estimation based on market signals and persona analysis</li>
      </ul>
      
      <h3>Quality Metrics</h3>
      <ul>
        <li>Average confidence score: ${Math.round(report.metadata.accuracyConfidence * 100)}%</li>
        <li>Processing time: ${Math.round(report.metadata.processingTime / 1000)} seconds</li>
        <li>Total analysis cost: $${report.metadata.totalCosts.toFixed(2)}</li>
      </ul>
    </div>`
  }

  private generateTopOpportunitiesHTML(opportunities: any[]): string {
    return `
    <div class="report-section">
      <h2>Top Opportunities</h2>
      ${opportunities.map((opp, index) => this.generateOpportunityCardHTML(opp, index + 1)).join('')}
    </div>`
  }

  private generateOpportunityDetailHTML(opportunity: any, metadata: any): string {
    return `
    <div class="report-section">
      <h1>${opportunity.title}</h1>
      <div class="opportunity-card">
        ${this.generateOpportunityCardHTML(opportunity, 1)}
      </div>
    </div>`
  }

  private generatePDFFooter(report: EnhancedReport, options: any): string {
    return `
    <div class="report-footer">
      <p>SaaS Opportunity Intelligence Platform | Report generated: ${new Date(report.metadata.generatedAt).toLocaleDateString()} | Processing time: ${Math.round(report.metadata.processingTime / 1000)}s | Version: 2.4.0</p>
      <p>© ${new Date().getFullYear()} SaaS Opportunity Intelligence Platform. All rights reserved.</p>
    </div>`
  }

  private getSectionTitle(sectionType: string): string {
    switch (sectionType) {
      case 'executive-summary': return 'Executive Summary'
      case 'opportunities': return 'SaaS Opportunities'
      case 'market-analysis': return 'Market Analysis'
      case 'methodology': return 'Methodology'
      default: return sectionType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  private async createPDFFromHTML(
    html: string,
    options: any
  ): Promise<Buffer> {
    if (!this.browser) {
      throw new Error('Browser not initialized')
    }

    const page = await this.browser.newPage()

    try {
      await page.setContent(html, { waitUntil: 'networkidle0' })

      const pdfOptions = {
        format: options.format || 'A4' as const,
        orientation: options.orientation || 'portrait' as const,
        printBackground: true,
        margin: {
          top: '1in',
          right: '0.75in',
          bottom: '1in',
          left: '0.75in'
        },
        displayHeaderFooter: options.includePageNumbers || false,
        headerTemplate: options.includePageNumbers ? `
          <div style="font-size: 10px; margin: 0 auto; color: #666;">
            SaaS Opportunity Intelligence Report
          </div>
        ` : '',
        footerTemplate: options.includePageNumbers ? `
          <div style="font-size: 10px; margin: 0 auto; color: #666;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        ` : '',
        preferCSSPageSize: true
      }

      const pdfBuffer = await page.pdf(pdfOptions)
      return pdfBuffer

    } finally {
      await page.close()
    }
  }

  private async trackPDFCosts(processingTimeMs: number, operation: string): Promise<void> {
    if (!this.analysisId || !this.costTrackingService) return

    try {
      // Estimate cost based on processing time (simplified)
      const estimatedCost = Math.max(0.01, processingTimeMs / 1000 * 0.001) // $0.001 per second

      await this.costTrackingService.recordCostEvent({
        analysisId: this.analysisId,
        eventType: 'pdf_generation',
        provider: 'puppeteer',
        quantity: 1,
        unitCost: estimatedCost,
        totalCost: estimatedCost,
        eventData: {
          service: 'pdf-generation',
          operation,
          processingTimeMs,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      AppLogger.error('Failed to track PDF generation cost', {
        service: 'pdf-generation',
        operation: 'track_cost_error',
        metadata: {
          analysisId: this.analysisId,
          operation,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  private async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}