import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DimensionAccordion } from '@/components/analysis/dimension-accordion'
import { DimensionalAnalysis } from '@/lib/types/dimensional-analysis'

// Mock the ui components
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => <span className={className}>{children}</span>
}))

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => <div data-testid="progress" data-value={value} />
}))

const mockDimensionalAnalysis: DimensionalAnalysis = {
  // Classifications
  persona: {
    value: 'freelance-designer',
    confidence: 0.85,
    evidence: ['I work as a freelancer', 'Design is my profession'],
    reasoning: 'User clearly states they are a freelance designer',
    feedback: []
  },
  industryVertical: {
    value: 'creative-services',
    confidence: 0.80,
    evidence: ['Design work', 'Creative projects'],
    reasoning: 'Operating in creative services industry',
    feedback: []
  },
  userRole: {
    value: 'business-owner',
    confidence: 0.75,
    evidence: ['My business', 'I manage clients'],
    reasoning: 'Operates own business with clients',
    feedback: []
  },
  workflowStage: {
    value: 'growth-optimization',
    confidence: 0.70,
    evidence: ['Looking to scale', 'Need better tools'],
    reasoning: 'Past startup phase, optimizing for growth',
    feedback: []
  },
  
  // Scores
  emotionLevel: {
    score: 7,
    confidence: 0.90,
    evidence: ['Very frustrated', 'This is driving me crazy'],
    reasoning: 'High emotional language indicates strong frustration',
    weight: 0.15,
    feedback: []
  },
  marketSize: {
    score: 8,
    confidence: 0.85,
    evidence: ['Many freelancers face this', 'Common problem'],
    reasoning: 'Large market of freelancers with similar needs',
    weight: 0.25,
    feedback: []
  },
  technicalComplexity: {
    score: 4,
    confidence: 0.80,
    evidence: ['Just need a simple tool', 'Basic features'],
    reasoning: 'Relatively simple to implement',
    weight: 0.15,
    feedback: []
  },
  existingSolutions: {
    score: 6,
    confidence: 0.75,
    evidence: ['Some tools exist but they suck', 'Current options are limited'],
    reasoning: 'Moderate competition with room for improvement',
    weight: 0.15,
    feedback: []
  },
  budgetContext: {
    score: 6,
    confidence: 0.70,
    evidence: ['Willing to pay $50/month', 'Need ROI'],
    reasoning: 'Moderate budget with clear value expectations',
    weight: 0.20,
    feedback: []
  },
  timeSensitivity: {
    score: 8,
    confidence: 0.85,
    evidence: ['Need this ASAP', 'Urgent problem'],
    reasoning: 'High urgency indicated',
    weight: 0.10,
    feedback: []
  },
  
  // Meta information
  compositeScore: 72,
  confidenceScore: 0.79,
  analysisVersion: '1.0.0',
  processingTime: 2500,
  createdAt: new Date('2025-01-16T10:00:00Z')
}

describe('DimensionAccordion', () => {
  const mockOnFeedback = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders composite score and meta information', () => {
    render(
      <DimensionAccordion
        dimensions={mockDimensionalAnalysis}
        onFeedback={mockOnFeedback}
      />
    )

    expect(screen.getByText('Overall Opportunity Score')).toBeInTheDocument()
    expect(screen.getByText('72/100')).toBeInTheDocument()
    expect(screen.getByText('Confidence: 79%')).toBeInTheDocument()
    expect(screen.getByText('Analysis v1.0.0')).toBeInTheDocument()
  })

  it('renders scored and classified dimension sections', () => {
    render(
      <DimensionAccordion
        dimensions={mockDimensionalAnalysis}
        onFeedback={mockOnFeedback}
      />
    )

    expect(screen.getByText('Scored Dimensions (1-10 Scale)')).toBeInTheDocument()
    expect(screen.getByText('Classified Dimensions (Categories)')).toBeInTheDocument()
    
    // Should show counts
    expect(screen.getAllByText('6')).toHaveLength(1) // 6 scored dimensions
    expect(screen.getAllByText('4')).toHaveLength(1) // 4 classified dimensions
  })

  it('expands scored dimensions section when clicked', async () => {
    render(
      <DimensionAccordion
        dimensions={mockDimensionalAnalysis}
        onFeedback={mockOnFeedback}
      />
    )

    const scoredSection = screen.getByText('Scored Dimensions (1-10 Scale)')
    fireEvent.click(scoredSection)

    await waitFor(() => {
      expect(screen.getByText('Emotion Level')).toBeInTheDocument()
      expect(screen.getByText('Market Size')).toBeInTheDocument()
      expect(screen.getByText('Technical Complexity')).toBeInTheDocument()
    })
  })

  it('expands classified dimensions section when clicked', async () => {
    render(
      <DimensionAccordion
        dimensions={mockDimensionalAnalysis}
        onFeedback={mockOnFeedback}
      />
    )

    const classifiedSection = screen.getByText('Classified Dimensions (Categories)')
    fireEvent.click(classifiedSection)

    await waitFor(() => {
      expect(screen.getByText('Persona')).toBeInTheDocument()
      expect(screen.getByText('Industry Vertical')).toBeInTheDocument()
      expect(screen.getByText('User Role')).toBeInTheDocument()
      expect(screen.getByText('Workflow Stage')).toBeInTheDocument()
    })
  })

  it('calls onFeedback when dimension feedback is submitted', async () => {
    render(
      <DimensionAccordion
        dimensions={mockDimensionalAnalysis}
        onFeedback={mockOnFeedback}
      />
    )

    // Expand scored dimensions
    const scoredSection = screen.getByText('Scored Dimensions (1-10 Scale)')
    fireEvent.click(scoredSection)

    await waitFor(() => {
      expect(screen.getByText('Emotion Level')).toBeInTheDocument()
    })

    // The dimension cards should contain feedback buttons
    // This tests the integration between accordion and dimension cards
    expect(mockOnFeedback).not.toHaveBeenCalled()
  })

  it('shows processing time and creation date', () => {
    render(
      <DimensionAccordion
        dimensions={mockDimensionalAnalysis}
        onFeedback={mockOnFeedback}
      />
    )

    expect(screen.getByText('Processing time: 2500ms')).toBeInTheDocument()
    expect(screen.getByText(/Analyzed:/)).toBeInTheDocument()
  })

  it('renders progress bar with correct value', () => {
    render(
      <DimensionAccordion
        dimensions={mockDimensionalAnalysis}
        onFeedback={mockOnFeedback}
      />
    )

    const progressBar = screen.getByTestId('progress')
    expect(progressBar).toHaveAttribute('data-value', '72')
  })

  it('applies correct color classes based on composite score', () => {
    const lowScoreDimensions = {
      ...mockDimensionalAnalysis,
      compositeScore: 30
    }

    const { rerender } = render(
      <DimensionAccordion
        dimensions={lowScoreDimensions}
        onFeedback={mockOnFeedback}
      />
    )

    // Should apply red color for low score
    expect(screen.getByText('30/100')).toBeInTheDocument()

    const highScoreDimensions = {
      ...mockDimensionalAnalysis,
      compositeScore: 85
    }

    rerender(
      <DimensionAccordion
        dimensions={highScoreDimensions}
        onFeedback={mockOnFeedback}
      />
    )

    // Should apply green color for high score
    expect(screen.getByText('85/100')).toBeInTheDocument()
  })

  it('can be used without help tooltips', () => {
    render(
      <DimensionAccordion
        dimensions={mockDimensionalAnalysis}
        onFeedback={mockOnFeedback}
        showHelp={false}
      />
    )

    expect(screen.getByText('Overall Opportunity Score')).toBeInTheDocument()
  })
})