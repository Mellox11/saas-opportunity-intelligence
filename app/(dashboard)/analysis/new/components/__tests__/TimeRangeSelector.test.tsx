import { render, screen, fireEvent } from '@testing-library/react'
import { TimeRangeSelector } from '../TimeRangeSelector'

describe('TimeRangeSelector', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('renders all time range options', () => {
    render(<TimeRangeSelector value={30} onChange={mockOnChange} />)
    
    expect(screen.getByText('30 Days')).toBeInTheDocument()
    expect(screen.getByText('60 Days')).toBeInTheDocument()
    expect(screen.getByText('90 Days')).toBeInTheDocument()
    expect(screen.getByText('Past month')).toBeInTheDocument()
    expect(screen.getByText('Past 2 months')).toBeInTheDocument()
    expect(screen.getByText('Past 3 months')).toBeInTheDocument()
  })

  it('highlights the selected time range', () => {
    render(<TimeRangeSelector value={60} onChange={mockOnChange} />)
    
    const button60 = screen.getByRole('button', { name: /60 Days Past 2 months/i })
    expect(button60).toHaveClass('bg-primary')
  })

  it('calls onChange when a different time range is selected', () => {
    render(<TimeRangeSelector value={30} onChange={mockOnChange} />)
    
    const button90 = screen.getByRole('button', { name: /90 Days Past 3 months/i })
    fireEvent.click(button90)
    
    expect(mockOnChange).toHaveBeenCalledWith(90)
  })

  it('disables all buttons when disabled prop is true', () => {
    render(<TimeRangeSelector value={30} onChange={mockOnChange} disabled />)
    
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toBeDisabled()
    })
  })

  it('shows cost information message', () => {
    render(<TimeRangeSelector value={30} onChange={mockOnChange} />)
    
    expect(screen.getByText(/Longer time ranges provide more data but may increase analysis costs/)).toBeInTheDocument()
  })
})