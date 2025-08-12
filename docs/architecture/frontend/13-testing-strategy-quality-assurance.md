# 13. Testing Strategy & Quality Assurance

## Testing Philosophy

**Test Pyramid Implementation**
- **Unit Tests (70%)**: Component logic, utilities, hooks
- **Integration Tests (20%)**: API integration, user workflows
- **E2E Tests (10%)**: Critical user paths, payment flows

**Testing Configuration**
```typescript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

**Component Testing Example**
```typescript
// __tests__/components/analysis-card.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnalysisCard } from '@/components/analysis/analysis-card'

describe('AnalysisCard', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  it('displays analysis information correctly', () => {
    const analysis = {
      id: '1',
      title: 'Test Analysis',
      status: 'completed',
      subreddits: ['entrepreneur', 'startups'],
      totalCost: 5.25,
      results: {
        totalOpportunities: 15,
        avgOpportunityScore: 78,
        antiPatterns: 2,
      }
    }

    render(
      <QueryClientProvider client={queryClient}>
        <AnalysisCard analysis={analysis} />
      </QueryClientProvider>
    )

    expect(screen.getByText('Test Analysis')).toBeInTheDocument()
    expect(screen.getByText('entrepreneur, startups')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('78')).toBeInTheDocument()
  })

  it('handles view results button click', async () => {
    const user = userEvent.setup()
    const mockPush = jest.fn()
    
    jest.mock('next/navigation', () => ({
      useRouter: () => ({ push: mockPush })
    }))

    render(
      <QueryClientProvider client={queryClient}>
        <AnalysisCard analysis={completedAnalysis} />
      </QueryClientProvider>
    )

    await user.click(screen.getByRole('button', { name: /view results/i }))
    expect(mockPush).toHaveBeenCalledWith('/analysis/1')
  })
})
```

## Accessibility Testing

```typescript
// __tests__/accessibility/constellation-map.test.tsx
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ConstellationMap } from '@/components/visualization/constellation-map'

expect.extend(toHaveNoViolations)

describe('ConstellationMap Accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(
      <ConstellationMap data={mockData} width={800} height={600} />
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('provides keyboard navigation for nodes', async () => {
    render(<ConstellationMap data={mockData} />)
    
    const firstNode = screen.getByRole('button', { name: /opportunity node/i })
    firstNode.focus()
    
    fireEvent.keyDown(firstNode, { key: 'Tab' })
    
    expect(document.activeElement).toHaveAttribute('role', 'button')
  })
})
```

---
