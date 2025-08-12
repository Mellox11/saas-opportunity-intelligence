# Frontend Architecture Document
## SaaS Opportunity Intelligence Tool

*Generated: 2025-08-07*
*Based on PRD and UX Specification requirements*

---

## Frontend Framework Decision

### Selected: Next.js 14+ with App Router

**Decision Status:** ✅ **SELECTED** - Option 1: Next.js 14+ with App Router

**Rationale:** Next.js 14+ with App Router provides the optimal balance of full-stack development efficiency, performance optimization, and modern React patterns required for our sophisticated fintech-inspired interface with real-time cost tracking and complex data visualizations.

**Key Advantages:**
- **Full-Stack Integration:** API routes eliminate need for separate backend setup during MVP phase
- **Performance Optimization:** Built-in image optimization, code splitting, and caching for constellation map and cost visualizations
- **Server-Side Rendering:** Essential for landing page SEO and initial load performance
- **Modern React Patterns:** App Router supports React 18+ features needed for concurrent rendering of real-time cost updates
- **Deployment Efficiency:** Vercel deployment optimization with edge functions for global performance

---

## Frontend Tech Stack

Based on the comprehensive requirements analysis from the PRD and UX specification, here are the recommended technology choices for implementing the SaaS Opportunity Intelligence Tool's sophisticated frontend experience:

### Core Framework & Runtime

**Next.js 14+ with App Router** - *Selected*
- **Version:** 14.0+ (Latest stable with App Router)
- **Rationale:** Provides full-stack development capabilities, excellent performance optimization, and modern React patterns essential for real-time cost tracking and complex data visualizations
- **Key Features Used:** API routes, server-side rendering, code splitting, image optimization, edge functions
- **Alternative Considered:** Vite + React (rejected due to need for full-stack integration and SSR requirements)

**React 18+**
- **Version:** 18.2+ (Latest stable)
- **Rationale:** Concurrent rendering features essential for smooth real-time updates, Suspense for progressive loading of constellation map
- **Key Features:** Concurrent rendering, Suspense, useTransition for non-blocking updates
- **Performance Impact:** Enables smooth 60fps animations with non-blocking cost updates

### State Management

**Zustand** - *Primary Choice*
- **Version:** 4.4+
- **Rationale:** Lightweight, TypeScript-friendly, perfect for real-time cost tracking without Redux complexity
- **Usage:** Global state for user session, analysis progress, cost accumulation, theme preferences
- **Performance:** Minimal bundle impact (~2KB), selective component updates prevent unnecessary re-renders
- **Alternative:** Redux Toolkit (rejected due to overhead for our use case)

**React Query (TanStack Query)** - *Server State*
- **Version:** 4.32+
- **Rationale:** Essential for managing analysis results, real-time polling, and cache invalidation
- **Usage:** API calls, background refetching, optimistic updates for cost tracking
- **Caching Strategy:** 5-minute cache for analysis results, real-time invalidation for cost updates

### UI Component System

**Headless UI** - *Primary Choice*
- **Version:** 1.7+ for React
- **Rationale:** Provides unstyled, accessible components perfect for our custom Mercury.com-inspired design
- **Components Used:** Dialog, Combobox (subreddit selection), Tabs, Disclosure, Popover
- **Accessibility:** Built-in WCAG AA compliance, keyboard navigation, screen reader support
- **Customization:** Full control over styling for dot grid patterns and cost crystallization effects

**Radix UI** - *Secondary/Alternative*
- **Version:** 1.0+
- **Rationale:** Backup option for complex components like constellation map controls and voice interface
- **Usage:** Slider (cost limits), Tooltip, DropdownMenu, Progress (analysis tracking)
- **Performance:** Tree-shakeable, only import needed components

### Styling & Design System

**Tailwind CSS** - *Primary Styling*
- **Version:** 3.3+
- **Rationale:** Perfect for implementing dot grid patterns, responsive design, and dark/light mode theming
- **Configuration:** Custom design tokens for Mercury.com-inspired color palette, spacing system
- **Dark Mode:** Class-based strategy with system preference detection
- **Performance:** PostCSS optimization removes unused styles, <50KB production bundle

**CSS-in-JS (Emotion)** - *Dynamic Styles*
- **Version:** 11.11+
- **Rationale:** Required for dynamic cost crystallization animations and constellation map styling
- **Usage:** Animation keyframes, theme-based dynamic colors, complex hover states
- **Performance:** Runtime optimization for critical animations only

### Data Visualization & Animation

**D3.js** - *Constellation Map*
- **Version:** 7.8+
- **Rationale:** Essential for sophisticated constellation map visualization with spatial relationships
- **Usage:** Force-directed graphs for opportunity clustering, zoom/pan interactions
- **Bundle Impact:** Selective imports (~30KB for used modules), lazy loaded when map view activated
- **Performance:** Canvas rendering for smooth 60fps with hundreds of nodes

**Framer Motion** - *UI Animations*
- **Version:** 10.16+
- **Rationale:** Perfect for cost crystallization animations, progress celebrations, and micro-interactions
- **Usage:** Crystal growth animations, progress indicators, page transitions
- **Accessibility:** Built-in `prefers-reduced-motion` support with meaningful alternatives
- **Performance:** GPU-accelerated transforms, automatic will-change management

**Recharts** - *Cost Analytics*
- **Version:** 2.8+
- **Rationale:** React-native charts for cost breakdown visualizations and usage analytics
- **Usage:** Cost trend charts, usage patterns, budget tracking visualizations
- **Customization:** Full theming support for dark/light modes

### Voice Interface & Real-time Features

**Web Speech API** - *Voice Recognition*
- **Native Browser API**
- **Rationale:** Built-in browser support eliminates external dependencies for voice configuration
- **Fallback:** Graceful degradation to traditional forms when unsupported
- **Privacy:** Client-side processing, no external voice services
- **Browser Support:** Chrome/Edge (90%+), Firefox/Safari fallback to traditional input

**Socket.io Client** - *Real-time Updates*
- **Version:** 4.7+
- **Rationale:** Essential for real-time cost tracking and progress updates during analysis
- **Usage:** Cost accumulation updates, progress notifications, analysis completion alerts
- **Fallback:** Intelligent polling with exponential backoff when WebSockets unavailable
- **Performance:** Automatic reconnection, heartbeat monitoring

### Form Handling & Validation

**React Hook Form** - *Form Management*
- **Version:** 7.45+
- **Rationale:** Excellent performance for complex analysis configuration forms with minimal re-renders
- **Usage:** Analysis setup, user preferences, payment forms
- **Validation:** Built-in validation with custom rules for subreddit format, cost limits
- **Accessibility:** Integrates with ARIA attributes and error messaging

**Zod** - *Schema Validation*
- **Version:** 3.22+
- **Rationale:** TypeScript-first validation ensures data consistency across client/server boundary
- **Usage:** Form validation, API response validation, configuration schema
- **Integration:** Perfect React Hook Form integration with type safety

### Payment Integration

**Stripe Elements** - *Payment Processing*
- **Version:** Latest (React Stripe.js)
- **Rationale:** Required for usage-based billing with sophisticated error handling
- **Security:** PCI compliance built-in, tokenization for secure payment processing
- **UX Integration:** Custom styling to match Mercury.com aesthetic
- **Features:** Payment intent handling, subscription management, webhook verification

### Performance & Optimization

**Next.js Image Component** - *Image Optimization*
- **Built-in Next.js feature**
- **Usage:** User avatars, opportunity preview images, responsive loading
- **Performance:** WebP/AVIF conversion, lazy loading, blur placeholders
- **Responsive:** Automatic sizing for different viewport breakpoints

**Webpack Bundle Analyzer** - *Build Optimization*
- **Development tool**
- **Usage:** Monitor bundle sizes, identify optimization opportunities
- **Performance Budget:** <200KB critical path, <500KB total initial load
- **Code Splitting:** Route-based and feature-based splitting for constellation map

### Development & Quality Tools

**TypeScript** - *Type Safety*
- **Version:** 5.1+
- **Configuration:** Strict mode enabled, path mapping for clean imports
- **Integration:** Full Next.js integration, component prop types, API contract validation
- **Benefits:** Reduces runtime errors, improves developer experience, enables confident refactoring

**ESLint + Prettier** - *Code Quality*
- **ESLint:** Next.js recommended config + accessibility rules
- **Prettier:** Consistent formatting across team
- **Integration:** Pre-commit hooks with lint-staged, VS Code integration
- **Accessibility:** eslint-plugin-jsx-a11y for WCAG compliance

**Jest + React Testing Library** - *Testing*
- **Unit Testing:** Component testing, utility function testing, form validation
- **Integration Testing:** API integration, payment flow, analysis workflow
- **Accessibility Testing:** @testing-library/jest-dom for ARIA testing
- **Performance:** Bundle size testing, animation frame rate validation

### Deployment & Monitoring

**Vercel** - *Primary Deployment*
- **Rationale:** Optimal Next.js integration, edge functions, automatic optimization
- **Features:** Preview deployments, analytics, Web Vitals monitoring
- **Performance:** Global CDN, automatic compression, edge caching
- **Scaling:** Automatic scaling for traffic spikes during analysis processing

**Sentry** - *Error Monitoring*
- **Version:** Latest React SDK
- **Usage:** Runtime error tracking, performance monitoring, user session replay
- **Integration:** Source map support, custom error boundaries
- **Privacy:** Configurable data scrubbing for sensitive information

### Browser Support & Compatibility

**Primary Support (95% features):**
- Chrome 100+ (Desktop/Mobile)
- Edge 100+ (Desktop)
- Firefox 100+ (Desktop/Mobile)
- Safari 15+ (Desktop/Mobile)

**Secondary Support (Core features only):**
- Chrome 90+ (Voice interface fallback)
- Firefox 90+ (Limited constellation map)
- Safari 14+ (Reduced animation complexity)

**Progressive Enhancement:**
- Core functionality works without JavaScript
- Enhanced features gracefully degrade
- Offline support for viewing cached analyses

---

## Architecture Decision Validation

### Requirements Mapping

✅ **Dark Mode as Default** - Tailwind CSS class-based dark mode with system preference detection
✅ **Sophisticated Fintech Design** - Headless UI + Tailwind for custom Mercury.com-inspired styling  
✅ **Real-time Cost Tracking** - Socket.io + React Query for live updates with fallback polling
✅ **Voice Interface with Waveform** - Web Speech API + custom visualizations with Framer Motion
✅ **Constellation Map Visualization** - D3.js for force-directed graphs with Canvas rendering
✅ **Cost Crystallization Animations** - Framer Motion with GPU acceleration and reduced motion support
✅ **WCAG AA Accessibility** - Headless UI foundations + comprehensive testing with axe-core
✅ **Stripe Integration** - Official React Stripe.js with custom styling integration

### Performance Validation

**Bundle Size Targets:**
- Critical Path: <200KB (Authentication, Configuration, Basic Results)
- Analysis Features: <150KB (Charts, Detailed Views, Chat Interface)  
- Advanced Features: <100KB (Constellation Map, Voice Interface)
- Total Initial: <500KB with progressive loading

**Runtime Performance:**
- 60fps animations on desktop, 30fps graceful degradation on mobile
- <100ms interaction response times
- <500ms real-time update latency
- <2.5s Largest Contentful Paint on 3G networks

### Security Considerations

**Client-Side Security:**
- Content Security Policy headers prevent XSS attacks
- Stripe tokenization eliminates PCI compliance requirements
- Environment variable security for API keys
- Input sanitization for all user-generated content

**Privacy Compliance:**
- GDPR-compliant data handling with user consent
- Local storage encryption for sensitive preferences
- Voice processing client-side only (no external services)
- User data export and deletion capabilities

---

## Next Section: Backend Architecture

With the frontend technology stack defined, the next section will cover:

**Backend Architecture & API Design**
1. Server architecture (Monolith + Workers hybrid)
2. Database design (PostgreSQL + Pinecone vector database)  
3. API architecture and real-time communication
4. Payment processing and billing system integration
5. AI processing pipeline and cost tracking
6. Queue management and worker processes

Would you like to proceed to the Backend Architecture section, or do you need any clarification on the frontend technology choices?

---

## 4. Bundle Size Strategy & Performance Budgets

### Performance Budget Framework

**Critical Path Budget: <200KB**
- Authentication flow: ~45KB (React Hook Form + Zod validation)
- Core layout and navigation: ~35KB (Headless UI components)
- Basic cost tracking interface: ~25KB (Zustand state + real-time updates)
- Essential utilities and error handling: ~20KB (error boundaries, logging)
- Initial CSS bundle: ~75KB (Tailwind critical path styles)

**Secondary Features Budget: <150KB Each**
- **Analysis Results Dashboard:** ~140KB
  - Recharts visualization library: ~45KB
  - Data processing utilities: ~30KB
  - Table components and filtering: ~35KB
  - Export functionality: ~30KB

- **Chat Interface:** ~125KB
  - Socket.io client: ~35KB
  - Message rendering components: ~25KB
  - Markdown parsing and syntax highlighting: ~40KB
  - Voice interface Web Speech API wrapper: ~25KB

**Advanced Features Budget: <100KB Each**
- **Constellation Map:** ~95KB (Lazy loaded)
  - D3.js selective imports: ~45KB (force layout, zoom, scales)
  - Canvas rendering utilities: ~20KB
  - Interactive controls: ~15KB (zoom, pan, filter)
  - Data transformation layer: ~15KB

- **Voice Interface:** ~75KB (Lazy loaded)
  - Web Speech API polyfills: ~25KB
  - Waveform visualization: ~20KB (Framer Motion animations)
  - Voice processing utilities: ~15KB
  - Accessibility adaptations: ~15KB

### Bundle Splitting Strategy

**Route-Based Splitting**
```typescript
// app/layout.tsx - Critical path
import { Navigation, AuthWrapper, CostTracker } from '@/components/core'

// app/dashboard/page.tsx - Secondary load
const AnalyticsDashboard = lazy(() => import('@/components/analytics/Dashboard'))

// app/analysis/[id]/page.tsx - Feature load  
const ConstellationMap = lazy(() => import('@/components/visualizations/ConstellationMap'))
const VoiceInterface = lazy(() => import('@/components/voice/VoiceInterface'))
```

**Feature-Based Code Splitting**
- Payment processing: Loaded only when accessing billing
- Voice interface: Loaded on first voice interaction attempt
- Constellation map: Loaded when switching to spatial view
- Export functionality: Loaded when user initiates export

### Loading Strategy Implementation

**Progressive Enhancement Approach**
1. **Critical Path (0-1s):** Authentication, navigation, basic cost display
2. **Secondary Load (1-3s):** Analysis results, basic charts, chat interface
3. **Advanced Features (3-5s):** Constellation map, voice interface, export tools
4. **Background Preload (5s+):** Next likely user actions based on behavior

**Intelligent Preloading**
```typescript
// Preload based on user behavior patterns
const preloadConstellationMap = useMemo(() => {
  return analysisResults?.posts?.length > 50 // Large dataset suggests map usage
}, [analysisResults])

// Preload voice interface if user has used it before
const preloadVoiceInterface = useCallback(() => {
  const hasUsedVoice = localStorage.getItem('voice-interface-used')
  return hasUsedVoice === 'true'
}, [])
```

### Performance Monitoring Integration

**Real-time Bundle Monitoring**
- Webpack Bundle Analyzer integration in CI/CD
- Performance budget failures block deployment
- Real-time performance monitoring with Vercel Analytics
- Core Web Vitals tracking for LCP, FID, CLS targets

**Target Metrics**
- **Largest Contentful Paint:** <2.5s on 3G networks
- **First Input Delay:** <100ms across all interactions
- **Cumulative Layout Shift:** <0.1 throughout session
- **Time to Interactive:** <3.5s for critical path

---

## 5. Integration Patterns - Monolith + Workers Architecture

### Frontend-Backend Communication Architecture

**Primary API Integration: Monolith Server**
```typescript
// API client configuration for main application server
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request/response interceptors for authentication and error handling
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  }
)
```

**Real-time Communication: WebSocket + Polling Hybrid**
```typescript
// Primary: Socket.io for real-time updates
const useRealtimeUpdates = (analysisId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  
  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL, {
      auth: { token: getAuthToken() },
      transports: ['websocket', 'polling']
    })
    
    socketInstance.on(`analysis-${analysisId}`, handleProgressUpdate)
    socketInstance.on(`cost-${analysisId}`, handleCostUpdate)
    
    setSocket(socketInstance)
    return () => socketInstance.close()
  }, [analysisId])
}

// Fallback: Intelligent polling for unreliable connections
const useFallbackPolling = (analysisId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['analysis-progress', analysisId],
    queryFn: () => fetchAnalysisProgress(analysisId),
    enabled: enabled && !socket?.connected,
    refetchInterval: (data) => {
      // Exponential backoff based on analysis stage
      const baseInterval = data?.stage === 'processing' ? 2000 : 5000
      return Math.min(baseInterval * Math.pow(1.5, data?.retryCount || 0), 30000)
    }
  })
}
```

### Worker Service Integration

**Background Job Status Integration**
```typescript
// Integration with worker queue status
interface WorkerJobStatus {
  jobId: string
  type: 'reddit-collection' | 'ai-analysis' | 'comment-processing'
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  estimatedCompletion: Date
  costAccumulated: number
}

const useWorkerStatus = (analysisId: string) => {
  const { data: jobs } = useQuery({
    queryKey: ['worker-jobs', analysisId],
    queryFn: () => fetchWorkerJobs(analysisId),
    refetchInterval: 3000,
    select: (data) => data.filter(job => job.analysisId === analysisId)
  })
  
  const overallProgress = useMemo(() => {
    return jobs?.reduce((total, job) => total + job.progress, 0) / (jobs?.length || 1)
  }, [jobs])
  
  return { jobs, overallProgress }
}
```

**Queue Management UI Integration**
```typescript
// Real-time queue position and wait time estimation
const QueueStatusDisplay = ({ analysisId }: { analysisId: string }) => {
  const { data: queueStatus } = useQuery({
    queryKey: ['queue-status', analysisId],
    queryFn: () => fetchQueueStatus(analysisId),
    refetchInterval: 5000
  })
  
  return (
    <div className="queue-status">
      <QueuePosition position={queueStatus.position} />
      <EstimatedWaitTime estimate={queueStatus.estimatedWait} />
      <WorkerCapacity 
        available={queueStatus.availableWorkers}
        total={queueStatus.totalWorkers}
      />
    </div>
  )
}
```

### Microservice Communication Patterns

**Service Discovery and Health Monitoring**
```typescript
// Frontend service health monitoring
const useServiceHealth = () => {
  return useQuery({
    queryKey: ['service-health'],
    queryFn: async () => {
      const services = ['reddit-api', 'ai-processor', 'payment-service']
      const healthChecks = await Promise.allSettled(
        services.map(service => checkServiceHealth(service))
      )
      
      return services.reduce((status, service, index) => {
        status[service] = healthChecks[index].status === 'fulfilled' ? 'healthy' : 'degraded'
        return status
      }, {} as Record<string, 'healthy' | 'degraded' | 'down'>)
    },
    refetchInterval: 30000
  })
}
```

**Graceful Degradation Strategy**
```typescript
// Feature degradation based on service availability
const useFeatureFlags = () => {
  const { data: serviceHealth } = useServiceHealth()
  
  return useMemo(() => ({
    voiceInterface: serviceHealth?.['ai-processor'] === 'healthy',
    realtimeUpdates: serviceHealth?.['websocket-service'] === 'healthy',
    paymentProcessing: serviceHealth?.['payment-service'] === 'healthy',
    constellationMap: true, // Client-side only, always available
  }), [serviceHealth])
}
```

### API Contract Management

**TypeScript API Contract Definition**
```typescript
// Shared API contract types between frontend and backend
interface AnalysisRequest {
  subreddits: string[]
  timeRange: {
    start: Date
    end: Date
  }
  keywords?: string[]
  maxCost: number
  notificationPreferences: {
    email: boolean
    push: boolean
    costThreshold: number
  }
}

interface AnalysisResponse {
  analysisId: string
  status: AnalysisStatus
  progress: ProgressUpdate
  results?: OpportunityResults
  costBreakdown: CostBreakdown
  metadata: AnalysisMetadata
}

// Runtime validation with Zod
const AnalysisResponseSchema = z.object({
  analysisId: z.string(),
  status: z.enum(['queued', 'processing', 'completed', 'failed']),
  progress: ProgressUpdateSchema,
  results: OpportunityResultsSchema.optional(),
  costBreakdown: CostBreakdownSchema,
  metadata: AnalysisMetadataSchema
})
```

---

## 6. Development Workflow Setup

### CI/CD Pipeline Configuration

**GitHub Actions Workflow**
```yaml
# .github/workflows/frontend-deploy.yml
name: Frontend CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18.17.0'
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type checking
        run: npm run type-check
      
      - name: Lint code
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          TEST_API_URL: ${{ secrets.TEST_API_URL }}
      
      - name: Bundle size analysis
        run: npm run analyze:bundle
      
      - name: Performance budget check
        run: npm run test:performance-budget

  accessibility:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.STAGING_API_URL }}
      
      - name: Accessibility audit
        run: npm run test:a11y
      
      - name: Visual regression testing
        run: npm run test:visual
        env:
          PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}

  deploy-staging:
    runs-on: ubuntu-latest
    needs: [test, accessibility]
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
      
      - name: Deploy to staging
        run: vercel deploy --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ env.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ env.VERCEL_PROJECT_ID }}

  deploy-production:
    runs-on: ubuntu-latest
    needs: [test, accessibility]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
      
      - name: Deploy to production
        run: vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ env.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ env.VERCEL_PROJECT_ID }}
```

### Testing Strategy Implementation

**Unit Testing Configuration**
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
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
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

**Integration Testing Setup**
```typescript
// tests/integration/analysis-workflow.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnalysisWorkflow } from '@/components/analysis/AnalysisWorkflow'

// Mock WebSocket for testing
const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
}

jest.mock('socket.io-client', () => ({
  io: () => mockSocket,
}))

describe('Analysis Workflow Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  it('completes full analysis workflow with real-time updates', async () => {
    const user = userEvent.setup()
    
    render(
      <QueryClientProvider client={queryClient}>
        <AnalysisWorkflow />
      </QueryClientProvider>
    )

    // Configure analysis
    await user.type(screen.getByLabelText(/subreddits/i), 'r/entrepreneur,r/startups')
    await user.selectOptions(screen.getByLabelText(/time range/i), '30days')
    await user.type(screen.getByLabelText(/max cost/i), '25')
    
    // Start analysis
    await user.click(screen.getByRole('button', { name: /start analysis/i }))
    
    // Verify real-time updates
    expect(screen.getByText(/analysis queued/i)).toBeInTheDocument()
    
    // Simulate WebSocket progress update
    act(() => {
      const progressHandler = mockSocket.on.mock.calls
        .find(call => call[0].includes('progress'))?.[1]
      progressHandler?.({ stage: 'collecting', progress: 25 })
    })
    
    await waitFor(() => {
      expect(screen.getByText(/collecting reddit data/i)).toBeInTheDocument()
      expect(screen.getByText(/25%/)).toBeInTheDocument()
    })
  })
})
```

**Performance Testing Configuration**
```typescript
// tests/performance/bundle-size.test.js
const { JSDOM } = require('jsdom')
const fs = require('fs')
const path = require('path')

describe('Bundle Size Performance', () => {
  const BUNDLE_SIZE_LIMITS = {
    'critical-path': 200 * 1024, // 200KB
    'analysis-features': 150 * 1024, // 150KB
    'advanced-features': 100 * 1024, // 100KB
  }

  it('critical path bundle stays under 200KB', () => {
    const statsPath = path.join(__dirname, '../../.next/analyze/client.json')
    const bundleStats = JSON.parse(fs.readFileSync(statsPath, 'utf8'))
    
    const criticalPathSize = bundleStats.chunks
      .filter(chunk => chunk.initial)
      .reduce((total, chunk) => total + chunk.size, 0)
    
    expect(criticalPathSize).toBeLessThan(BUNDLE_SIZE_LIMITS['critical-path'])
  })
})
```

### Environment Configuration Management

**Environment Variable Structure**
```bash
# .env.local (Development)
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_SENTRY_DSN=https://...

# Backend service URLs
REDDIT_API_URL=http://localhost:3002
AI_SERVICE_URL=http://localhost:3003
PAYMENT_SERVICE_URL=http://localhost:3004

# .env.production (Production)
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_API_URL=https://api.saasopportunity.com/v1
NEXT_PUBLIC_WEBSOCKET_URL=https://realtime.saasopportunity.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_SENTRY_DSN=https://...

# Feature flags
NEXT_PUBLIC_ENABLE_VOICE_INTERFACE=true
NEXT_PUBLIC_ENABLE_CONSTELLATION_MAP=true
NEXT_PUBLIC_ENABLE_BETA_FEATURES=false
```

**Configuration Validation**
```typescript
// lib/config.ts
import { z } from 'zod'

const ConfigSchema = z.object({
  app: z.object({
    env: z.enum(['development', 'staging', 'production']),
    baseUrl: z.string().url(),
  }),
  api: z.object({
    baseUrl: z.string().url(),
    timeout: z.number().default(30000),
  }),
  websocket: z.object({
    url: z.string().url(),
    reconnectInterval: z.number().default(3000),
  }),
  stripe: z.object({
    publishableKey: z.string().min(1),
  }),
  features: z.object({
    voiceInterface: z.boolean().default(true),
    constellationMap: z.boolean().default(true),
    betaFeatures: z.boolean().default(false),
  }),
})

export const config = ConfigSchema.parse({
  app: {
    env: process.env.NEXT_PUBLIC_APP_ENV,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
  },
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL,
    timeout: parseInt(process.env.API_TIMEOUT || '30000'),
  },
  websocket: {
    url: process.env.NEXT_PUBLIC_WEBSOCKET_URL,
  },
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  features: {
    voiceInterface: process.env.NEXT_PUBLIC_ENABLE_VOICE_INTERFACE === 'true',
    constellationMap: process.env.NEXT_PUBLIC_ENABLE_CONSTELLATION_MAP === 'true',
    betaFeatures: process.env.NEXT_PUBLIC_ENABLE_BETA_FEATURES === 'true',
  },
})
```

---

## 7. Security Considerations

### Authentication & Authorization

**JWT Token Management**
```typescript
// lib/auth/token-manager.ts
interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'saas-auth-token'
  private static readonly REFRESH_TOKEN_KEY = 'saas-refresh-token'
  
  static setTokens(tokens: AuthTokens): void {
    // Encrypt sensitive tokens before storage
    const encryptedAccess = this.encrypt(tokens.accessToken)
    const encryptedRefresh = this.encrypt(tokens.refreshToken)
    
    localStorage.setItem(this.ACCESS_TOKEN_KEY, encryptedAccess)
    localStorage.setItem(this.REFRESH_TOKEN_KEY, encryptedRefresh)
    localStorage.setItem('token-expires', tokens.expiresAt.toString())
  }
  
  static getAccessToken(): string | null {
    const encrypted = localStorage.getItem(this.ACCESS_TOKEN_KEY)
    if (!encrypted) return null
    
    const expiresAt = parseInt(localStorage.getItem('token-expires') || '0')
    if (Date.now() > expiresAt) {
      this.clearTokens()
      return null
    }
    
    return this.decrypt(encrypted)
  }
  
  private static encrypt(data: string): string {
    // Client-side encryption for token storage
    return btoa(encodeURIComponent(data))
  }
  
  private static decrypt(encrypted: string): string {
    return decodeURIComponent(atob(encrypted))
  }
}
```

**Session Management with Automatic Refresh**
```typescript
// hooks/use-auth.ts
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const refreshToken = useCallback(async () => {
    try {
      const refresh = TokenManager.getRefreshToken()
      if (!refresh) throw new Error('No refresh token')
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${refresh}` },
      })
      
      if (!response.ok) throw new Error('Refresh failed')
      
      const tokens = await response.json()
      TokenManager.setTokens(tokens)
      
      return tokens.accessToken
    } catch (error) {
      TokenManager.clearTokens()
      setUser(null)
      throw error
    }
  }, [])
  
  // Automatic token refresh before expiration
  useEffect(() => {
    const token = TokenManager.getAccessToken()
    if (!token) {
      setIsLoading(false)
      return
    }
    
    const payload = JSON.parse(atob(token.split('.')[1]))
    const expiresIn = payload.exp * 1000 - Date.now()
    
    if (expiresIn < 60000) { // Refresh if expires in < 1 minute
      refreshToken().catch(() => setUser(null))
    }
    
    const refreshTimer = setTimeout(() => {
      refreshToken().catch(() => setUser(null))
    }, Math.max(expiresIn - 60000, 0))
    
    return () => clearTimeout(refreshTimer)
  }, [refreshToken])
}
```

### API Security Implementation

**Request Signing and Validation**
```typescript
// lib/api/secure-client.ts
class SecureApiClient {
  private static generateRequestSignature(
    method: string,
    url: string,
    body: string,
    timestamp: number,
    nonce: string
  ): string {
    const message = `${method.toUpperCase()}\n${url}\n${body}\n${timestamp}\n${nonce}`
    // Implementation would use actual HMAC-SHA256 with secret key
    return btoa(message) // Simplified for example
  }
  
  static async secureRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const timestamp = Date.now()
    const nonce = crypto.randomUUID()
    const body = options.body?.toString() || ''
    
    const signature = this.generateRequestSignature(
      options.method || 'GET',
      endpoint,
      body,
      timestamp,
      nonce
    )
    
    const headers = {
      ...options.headers,
      'X-Timestamp': timestamp.toString(),
      'X-Nonce': nonce,
      'X-Signature': signature,
      'X-Client-Version': process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    }
    
    const response = await fetch(endpoint, {
      ...options,
      headers,
    })
    
    if (!response.ok) {
      throw new ApiError(response.status, await response.text())
    }
    
    return response.json()
  }
}
```

**Content Security Policy Configuration**
```typescript
// next.config.js
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' *.stripe.com *.sentry.io;
  style-src 'self' 'unsafe-inline' fonts.googleapis.com;
  font-src 'self' fonts.gstatic.com;
  img-src 'self' data: blob: *.stripe.com *.gravatar.com;
  connect-src 'self' *.stripe.com *.sentry.io wss: ws: ${process.env.NEXT_PUBLIC_API_URL};
  media-src 'self' blob:;
  worker-src 'self' blob:;
  child-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim()
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'false'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
]
```

### Data Protection & Privacy

**Client-Side Data Encryption**
```typescript
// lib/crypto/data-encryption.ts
class ClientDataEncryption {
  private static async generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
  }
  
  static async encryptSensitiveData(data: string): Promise<{
    encrypted: string
    iv: string
  }> {
    const key = await this.generateKey()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(data)
    )
    
    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv))
    }
  }
  
  static async decryptSensitiveData(
    encrypted: string,
    iv: string,
    key: CryptoKey
  ): Promise<string> {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(atob(iv).split('').map(c => c.charCodeAt(0))) },
      key,
      new Uint8Array(atob(encrypted).split('').map(c => c.charCodeAt(0)))
    )
    
    return new TextDecoder().decode(decrypted)
  }
}
```

**GDPR Compliance Implementation**
```typescript
// components/privacy/consent-manager.tsx
interface ConsentPreferences {
  analytics: boolean
  marketing: boolean
  performance: boolean
  functional: boolean
}

export const ConsentManager = () => {
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    analytics: false,
    marketing: false,
    performance: true,
    functional: true,
  })
  
  const updateConsent = useCallback(async (newPreferences: ConsentPreferences) => {
    setPreferences(newPreferences)
    
    // Store preferences
    localStorage.setItem('consent-preferences', JSON.stringify({
      ...newPreferences,
      timestamp: Date.now(),
      version: '1.0'
    }))
    
    // Update tracking scripts
    if (newPreferences.analytics) {
      loadAnalyticsScript()
    } else {
      removeAnalyticsScript()
    }
    
    // Notify backend of consent changes
    await fetch('/api/privacy/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPreferences)
    })
  }, [])
  
  const exportUserData = useCallback(async () => {
    const response = await fetch('/api/privacy/export-data', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TokenManager.getAccessToken()}`
      }
    })
    
    if (response.ok) {
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'user-data-export.json'
      a.click()
      URL.revokeObjectURL(url)
    }
  }, [])
  
  const deleteUserData = useCallback(async () => {
    if (confirm('This will permanently delete all your data. This action cannot be undone.')) {
      await fetch('/api/privacy/delete-data', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${TokenManager.getAccessToken()}`
        }
      })
      
      TokenManager.clearTokens()
      window.location.href = '/data-deleted'
    }
  }, [])
}
```

---

## 8. Performance Optimization

### Real-time Feature Optimization

**WebSocket Connection Optimization**
```typescript
// lib/websocket/optimized-client.ts
class OptimizedWebSocketClient {
  private connection: Socket | null = null
  private reconnectAttempts = 0
  private messageQueue: Array<{ event: string; data: any }> = []
  private heartbeatInterval: NodeJS.Timeout | null = null
  
  connect(analysisId: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      this.connection = io(config.websocket.url, {
        auth: { token: TokenManager.getAccessToken() },
        transports: ['websocket'], // Prefer WebSocket over polling
        upgrade: true,
        rememberUpgrade: true,
        timeout: 10000,
        forceNew: false, // Reuse existing connection when possible
      })
      
      this.connection.on('connect', () => {
        this.reconnectAttempts = 0
        this.flushMessageQueue()
        this.startHeartbeat()
        resolve(this.connection!)
      })
      
      this.connection.on('disconnect', (reason) => {
        this.stopHeartbeat()
        if (reason === 'io server disconnect') {
          // Server initiated disconnect - reconnect
          this.reconnect()
        }
      })
      
      this.connection.on('connect_error', (error) => {
        if (this.reconnectAttempts < 5) {
          setTimeout(() => this.reconnect(), Math.pow(2, this.reconnectAttempts) * 1000)
        } else {
          reject(error)
        }
      })
    })
  }
  
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.connection?.connected) {
        this.connection.emit('heartbeat', Date.now())
      }
    }, 30000)
  }
  
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message && this.connection?.connected) {
        this.connection.emit(message.event, message.data)
      }
    }
  }
  
  emit(event: string, data: any): void {
    if (this.connection?.connected) {
      this.connection.emit(event, data)
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push({ event, data })
    }
  }
}
```

**Real-time Update Batching**
```typescript
// hooks/use-batched-updates.ts
export const useBatchedUpdates = <T>(
  updates$: Observable<T>,
  batchSize: number = 10,
  batchTimeout: number = 100
) => {
  const [batchedData, setBatchedData] = useState<T[]>([])
  const batchRef = useRef<T[]>([])
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  const flushBatch = useCallback(() => {
    if (batchRef.current.length > 0) {
      setBatchedData(prev => [...prev, ...batchRef.current])
      batchRef.current = []
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }
  }, [])
  
  useEffect(() => {
    const subscription = updates$.subscribe(update => {
      batchRef.current.push(update)
      
      // Flush immediately if batch is full
      if (batchRef.current.length >= batchSize) {
        flushBatch()
        return
      }
      
      // Schedule flush if not already scheduled
      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(flushBatch, batchTimeout)
      }
    })
    
    return () => {
      subscription.unsubscribe()
      flushBatch()
    }
  }, [updates$, batchSize, batchTimeout, flushBatch])
  
  return batchedData
}

// Usage in cost tracking component
const CostTracker = ({ analysisId }: { analysisId: string }) => {
  const costUpdates$ = useMemo(() => 
    new Observable(subscriber => {
      socket.on(`cost-${analysisId}`, (update) => subscriber.next(update))
      return () => socket.off(`cost-${analysisId}`)
    }), [analysisId]
  )
  
  const batchedCostUpdates = useBatchedUpdates(costUpdates$, 5, 250)
  
  const totalCost = useMemo(() => 
    batchedCostUpdates.reduce((sum, update) => sum + update.amount, 0),
    [batchedCostUpdates]
  )
}
```

### Visualization Performance Optimization

**Constellation Map Performance**
```typescript
// components/visualizations/optimized-constellation-map.tsx
interface ConstellationMapProps {
  data: OpportunityNode[]
  width: number
  height: number
}

const OptimizedConstellationMap: React.FC<ConstellationMapProps> = ({
  data,
  width,
  height
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const workerRef = useRef<Worker>()
  
  // Offload force simulation to Web Worker
  useEffect(() => {
    workerRef.current = new Worker('/workers/force-simulation.worker.js')
    
    workerRef.current.onmessage = (event) => {
      const { nodes, links } = event.data
      drawFrame(nodes, links)
    }
    
    return () => workerRef.current?.terminate()
  }, [])
  
  // Initialize simulation in worker
  useEffect(() => {
    if (workerRef.current && data.length > 0) {
      workerRef.current.postMessage({
        type: 'initialize',
        nodes: data,
        width,
        height,
        config: {
          alpha: 0.3,
          alphaDecay: 0.0228,
          velocityDecay: 0.4,
        }
      })
    }
  }, [data, width, height])
  
  const drawFrame = useCallback((nodes: any[], links: any[]) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    
    // Clear canvas
    ctx.clearRect(0, 0, width * dpr, height * dpr)
    
    // Draw links with alpha based on connection strength
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    
    links.forEach(link => {
      ctx.beginPath()
      ctx.moveTo(link.source.x * dpr, link.source.y * dpr)
      ctx.lineTo(link.target.x * dpr, link.target.y * dpr)
      ctx.stroke()
    })
    
    // Draw nodes with size based on opportunity score
    nodes.forEach(node => {
      const radius = Math.max(2, node.score / 10) * dpr
      
      ctx.fillStyle = getNodeColor(node.category)
      ctx.beginPath()
      ctx.arc(node.x * dpr, node.y * dpr, radius, 0, 2 * Math.PI)
      ctx.fill()
      
      // Draw score text for high-value opportunities
      if (node.score > 70) {
        ctx.fillStyle = '#ffffff'
        ctx.font = `${12 * dpr}px Inter`
        ctx.textAlign = 'center'
        ctx.fillText(
          node.score.toString(),
          node.x * dpr,
          node.y * dpr + 4 * dpr
        )
      }
    })
  }, [width, height])
  
  // Optimized zoom and pan handling
  const { transform, ref: zoomRef } = useZoomPan({
    minZoom: 0.1,
    maxZoom: 10,
    onTransform: useCallback((transform) => {
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')!
        ctx.save()
        ctx.setTransform(
          transform.k, 0, 0, transform.k,
          transform.x, transform.y
        )
        // Redraw with new transform
        workerRef.current?.postMessage({ type: 'redraw' })
        ctx.restore()
      }
    }, [])
  })
  
  return (
    <div ref={zoomRef} className="constellation-map-container">
      <canvas
        ref={canvasRef}
        width={width * (window.devicePixelRatio || 1)}
        height={height * (window.devicePixelRatio || 1)}
        style={{ width, height }}
        className="constellation-canvas"
      />
      
      {/* Performance overlay */}
      <ConstellationMapControls
        nodeCount={data.length}
        transform={transform}
        onFilterChange={handleFilterChange}
      />
    </div>
  )
}
```

**Chart Performance Optimization**
```typescript
// components/charts/optimized-cost-chart.tsx
const OptimizedCostChart = ({ data, timeRange }: CostChartProps) => {
  // Implement data downsampling for large datasets
  const downsampledData = useMemo(() => {
    if (data.length <= 100) return data
    
    // Use largest-triangle-three-buckets algorithm for downsampling
    return downsampleData(data, 100)
  }, [data])
  
  // Virtualize chart rendering for smooth scrolling
  const { visibleData, scrollOffset } = useVirtualizedChart({
    data: downsampledData,
    itemHeight: 400,
    containerHeight: 600,
  })
  
  // Memoize expensive chart calculations
  const chartConfig = useMemo(() => ({
    margin: { top: 20, right: 30, bottom: 20, left: 20 },
    colors: ['#10b981', '#f59e0b', '#ef4444'],
    animations: {
      duration: 300,
      easing: 'easeInOutCubic',
    },
    tooltip: {
      formatter: (value: number) => `$${value.toFixed(4)}`,
      labelFormatter: (label: string) => new Date(label).toLocaleDateString(),
    }
  }), [])
  
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={visibleData}
        margin={chartConfig.margin}
        syncId="cost-tracking"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis
          dataKey="timestamp"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={formatTimestamp}
          stroke="#6b7280"
        />
        <YAxis
          domain={['dataMin', 'dataMax']}
          tickFormatter={formatCurrency}
          stroke="#6b7280"
        />
        <Tooltip
          content={<CustomTooltip />}
          formatter={chartConfig.tooltip.formatter}
          labelFormatter={chartConfig.tooltip.labelFormatter}
        />
        <Line
          type="monotone"
          dataKey="cost"
          stroke={chartConfig.colors[0]}
          strokeWidth={2}
          dot={false} // Disable dots for performance
          activeDot={{ r: 4, stroke: chartConfig.colors[0], strokeWidth: 2 }}
          animationDuration={chartConfig.animations.duration}
          animationEasing={chartConfig.animations.easing}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Data downsampling utility
function downsampleData(data: any[], targetPoints: number): any[] {
  if (data.length <= targetPoints) return data
  
  const sampledData: any[] = []
  const bucketSize = data.length / targetPoints
  
  for (let i = 0; i < targetPoints - 2; i++) {
    const bucketStart = Math.floor(i * bucketSize)
    const bucketEnd = Math.floor((i + 1) * bucketSize)
    
    // Find point with largest triangle area
    let maxArea = 0
    let selectedPoint = data[bucketStart]
    
    for (let j = bucketStart; j < bucketEnd; j++) {
      const area = calculateTriangleArea(
        i > 0 ? sampledData[i - 1] : data[0],
        data[j],
        data[bucketEnd] || data[data.length - 1]
      )
      
      if (area > maxArea) {
        maxArea = area
        selectedPoint = data[j]
      }
    }
    
    sampledData.push(selectedPoint)
  }
  
  return [data[0], ...sampledData, data[data.length - 1]]
}
```

### Memory Management and Cleanup

**Memory Leak Prevention**
```typescript
// hooks/use-memory-cleanup.ts
export const useMemoryCleanup = () => {
  const cleanupTasks = useRef<Array<() => void>>([])
  
  const addCleanupTask = useCallback((task: () => void) => {
    cleanupTasks.current.push(task)
  }, [])
  
  const performCleanup = useCallback(() => {
    cleanupTasks.current.forEach(task => {
      try {
        task()
      } catch (error) {
        console.warn('Cleanup task failed:', error)
      }
    })
    cleanupTasks.current = []
  }, [])
  
  useEffect(() => {
    // Cleanup on unmount
    return performCleanup
  }, [performCleanup])
  
  // Cleanup on visibility change (user switches tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        performCleanup()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      performCleanup()
    }
  }, [performCleanup])
  
  return { addCleanupTask, performCleanup }
}

// Usage in constellation map
const ConstellationMap = () => {
  const { addCleanupTask } = useMemoryCleanup()
  
  useEffect(() => {
    const worker = new Worker('/workers/simulation.worker.js')
    const canvas = canvasRef.current
    
    // Register cleanup tasks
    addCleanupTask(() => {
      worker.terminate()
    })
    
    addCleanupTask(() => {
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
    })
    
    addCleanupTask(() => {
      // Clear any cached data
      simulationCache.clear()
    })
  }, [addCleanupTask])
}
```

---

## Next Phase: Architecture Document Completion

With the five core sections now completed, the frontend architecture document covers:

✅ **Bundle Size Strategy** - Performance budgets, loading optimization, and monitoring
✅ **Integration Patterns** - Monolith + Workers communication, API contracts, graceful degradation
✅ **Development Workflow** - CI/CD pipeline, testing strategy, environment management
✅ **Security Considerations** - Authentication, API security, data protection, GDPR compliance
✅ **Performance Optimization** - Real-time features, visualization performance, memory management

### Continue Architecture Document Creation

Please select the next phase for completing the comprehensive architecture documentation:

**9.** **Deployment Architecture** - Infrastructure setup, scaling strategies, monitoring and alerting

**10.** **Error Handling & Resilience** - Error boundaries, fallback strategies, offline capability

**11.** **Internationalization & Accessibility** - Multi-language support, WCAG 2.1 AA compliance implementation

**12.** **Analytics & Monitoring** - User behavior tracking, performance monitoring, business metrics

**13.** **Migration & Maintenance Strategy** - Version management, database migrations, technical debt management

**14.** **Final Review & Implementation Roadmap** - Priority matrix, development phases, launch checklist

---

## 9. Project Structure & File Organization

### Next.js 14 App Router Structure

**Root Directory Organization**
```
saas-opportunity-intelligence/
├── app/                          # Next.js 14 App Router
│   ├── globals.css              # Global styles and Tailwind imports
│   ├── layout.tsx               # Root layout with providers
│   ├── loading.tsx              # Global loading component
│   ├── error.tsx                # Global error boundary
│   ├── not-found.tsx            # 404 page
│   │
│   ├── (auth)/                  # Auth route group
│   │   ├── layout.tsx           # Auth-specific layout
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   ├── register/
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   └── forgot-password/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/             # Dashboard route group
│   │   ├── layout.tsx           # Dashboard layout with navigation
│   │   ├── dashboard/
│   │   │   ├── page.tsx         # Main dashboard
│   │   │   ├── loading.tsx
│   │   │   └── error.tsx
│   │   │
│   │   ├── analysis/            # Analysis workflows
│   │   │   ├── page.tsx         # Analysis list/history
│   │   │   ├── new/
│   │   │   │   ├── page.tsx     # New analysis configuration
│   │   │   │   ├── components/  # Analysis-specific components
│   │   │   │   │   ├── SubredditSelector.tsx
│   │   │   │   │   ├── TimeRangeSelector.tsx
│   │   │   │   │   ├── CostEstimator.tsx
│   │   │   │   │   └── VoiceConfiguration.tsx
│   │   │   │   └── loading.tsx
│   │   │   │
│   │   │   └── [id]/            # Dynamic analysis routes
│   │   │       ├── page.tsx     # Analysis results overview
│   │   │       ├── layout.tsx   # Analysis-specific layout
│   │   │       ├── loading.tsx
│   │   │       ├── error.tsx
│   │   │       │
│   │   │       ├── constellation/
│   │   │       │   ├── page.tsx # Constellation map view
│   │   │       │   └── components/
│   │   │       │       ├── ConstellationMap.tsx
│   │   │       │       ├── NodeDetail.tsx
│   │   │       │       └── ConstellationControls.tsx
│   │   │       │
│   │   │       ├── chat/
│   │   │       │   ├── page.tsx # Chat interface
│   │   │       │   └── components/
│   │   │       │       ├── ChatInterface.tsx
│   │   │       │       ├── MessageList.tsx
│   │   │       │       └── VoiceInput.tsx
│   │   │       │
│   │   │       └── export/
│   │   │           └── page.tsx # Export functionality
│   │   │
│   │   ├── billing/             # Billing and cost management
│   │   │   ├── page.tsx
│   │   │   ├── usage/
│   │   │   │   └── page.tsx
│   │   │   └── components/
│   │   │       ├── UsageChart.tsx
│   │   │       ├── CostBreakdown.tsx
│   │   │       └── PaymentMethod.tsx
│   │   │
│   │   └── settings/            # User settings
│   │       ├── page.tsx
│   │       ├── profile/
│   │       │   └── page.tsx
│   │       ├── preferences/
│   │       │   └── page.tsx
│   │       └── api-keys/
│   │           └── page.tsx
│   │
│   ├── api/                     # API routes
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   └── refresh/route.ts
│   │   ├── analysis/
│   │   │   ├── route.ts         # POST /api/analysis
│   │   │   └── [id]/
│   │   │       ├── route.ts     # GET /api/analysis/[id]
│   │   │       ├── progress/
│   │   │       │   └── route.ts # GET /api/analysis/[id]/progress
│   │   │       └── export/
│   │   │           └── route.ts # GET /api/analysis/[id]/export
│   │   ├── billing/
│   │   │   ├── usage/route.ts
│   │   │   └── webhook/route.ts # Stripe webhooks
│   │   └── health/route.ts      # Health check endpoint
│   │
│   └── (marketing)/             # Marketing pages route group
       ├── layout.tsx            # Marketing layout
       ├── page.tsx              # Landing page
       ├── pricing/
       │   └── page.tsx
       ├── features/
       │   └── page.tsx
       └── about/
           └── page.tsx
```

**Components Directory Structure**
```
components/
├── ui/                          # Base UI components (shadcn/ui style)
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   ├── tooltip.tsx
│   ├── progress.tsx
│   ├── badge.tsx
│   ├── card.tsx
│   ├── tabs.tsx
│   └── index.ts                 # Re-exports
│
├── forms/                       # Form components
│   ├── AnalysisConfigurationForm.tsx
│   ├── AuthForms.tsx
│   ├── PaymentForm.tsx
│   └── fields/                  # Form field components
│       ├── SubredditInput.tsx
│       ├── TimeRangeField.tsx
│       ├── CostLimitField.tsx
│       └── KeywordField.tsx
│
├── visualization/               # Data visualization components
│   ├── constellation/
│   │   ├── ConstellationMap.tsx
│   │   ├── ConstellationNode.tsx
│   │   ├── ConstellationLink.tsx
│   │   ├── ConstellationControls.tsx
│   │   └── hooks/
│   │       ├── useForceSimulation.ts
│   │       ├── useZoomPan.ts
│   │       └── useNodeInteraction.ts
│   │
│   ├── charts/
│   │   ├── CostChart.tsx
│   │   ├── OpportunityScoreChart.tsx
│   │   ├── UsageChart.tsx
│   │   └── common/
│   │       ├── ChartContainer.tsx
│   │       ├── ChartTooltip.tsx
│   │       └── ChartLegend.tsx
│   │
│   └── progress/
│       ├── ProgressTracker.tsx
│       ├── CostCrystallizer.tsx
│       └── AnalysisStageIndicator.tsx
│
├── analysis/                    # Analysis-specific components
│   ├── AnalysisCard.tsx
│   ├── OpportunityCard.tsx
│   ├── ResultsSummary.tsx
│   ├── AntiPatternAlert.tsx
│   ├── ConfidenceIndicator.tsx
│   └── filters/
│       ├── CategoryFilter.tsx
│       ├── ScoreFilter.tsx
│       └── DateFilter.tsx
│
├── chat/                        # Chat interface components
│   ├── ChatInterface.tsx
│   ├── MessageList.tsx
│   ├── MessageBubble.tsx
│   ├── ChatInput.tsx
│   ├── VoiceInput.tsx
│   ├── WaveformVisualizer.tsx
│   └── TypingIndicator.tsx
│
├── billing/                     # Billing-related components
│   ├── CostTracker.tsx
│   ├── UsageDisplay.tsx
│   ├── PaymentMethodManager.tsx
│   ├── InvoiceList.tsx
│   └── BillingAlert.tsx
│
├── layout/                      # Layout components
│   ├── Navigation.tsx
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Breadcrumb.tsx
│   └── providers/
│       ├── QueryProvider.tsx
│       ├── AuthProvider.tsx
│       ├── ThemeProvider.tsx
│       └── SocketProvider.tsx
│
└── common/                      # Common/shared components
    ├── LoadingSpinner.tsx
    ├── ErrorBoundary.tsx
    ├── EmptyState.tsx
    ├── DataTable.tsx
    ├── SearchBox.tsx
    ├── DatePicker.tsx
    ├── FileUpload.tsx
    └── FeatureFlag.tsx
```

**Library and Utilities Structure**
```
lib/
├── api/                         # API client and utilities
│   ├── client.ts               # Base API client configuration
│   ├── auth.ts                 # Authentication API calls
│   ├── analysis.ts             # Analysis-related API calls
│   ├── billing.ts              # Billing API calls
│   ├── types.ts                # API type definitions
│   └── error-handling.ts       # API error handling utilities
│
├── auth/                        # Authentication utilities
│   ├── token-manager.ts        # Token storage and refresh
│   ├── auth-guard.ts           # Route protection
│   └── session-manager.ts      # Session management
│
├── websocket/                   # WebSocket client
│   ├── client.ts               # WebSocket connection management
│   ├── event-handlers.ts       # Event handling logic
│   └── reconnection.ts         # Reconnection strategies
│
├── visualization/               # Visualization utilities
│   ├── d3-utils.ts             # D3.js helper functions
│   ├── constellation-math.ts   # Constellation positioning algorithms
│   ├── color-schemes.ts        # Color palettes and theming
│   └── data-processing.ts      # Data transformation utilities
│
├── analytics/                   # Analytics and tracking
│   ├── events.ts               # Event tracking definitions
│   ├── performance.ts          # Performance monitoring
│   └── user-behavior.ts        # User behavior tracking
│
├── validation/                  # Data validation schemas
│   ├── analysis-schema.ts      # Analysis configuration validation
│   ├── auth-schema.ts          # Authentication validation
│   ├── billing-schema.ts       # Billing validation
│   └── api-schema.ts           # API response validation
│
├── utils/                       # General utilities
│   ├── date.ts                 # Date formatting and manipulation
│   ├── currency.ts             # Currency formatting
│   ├── string.ts               # String utilities
│   ├── array.ts                # Array manipulation utilities
│   ├── debounce.ts             # Debouncing utilities
│   └── storage.ts              # Local storage utilities
│
├── hooks/                       # Custom React hooks
│   ├── use-auth.ts             # Authentication hook
│   ├── use-analysis.ts         # Analysis management hook
│   ├── use-realtime.ts         # Real-time updates hook
│   ├── use-billing.ts          # Billing information hook
│   ├── use-voice.ts            # Voice interface hook
│   ├── use-constellation.ts    # Constellation map hook
│   └── use-debounce.ts         # Debouncing hook
│
├── constants/                   # Application constants
│   ├── api.ts                  # API endpoints and configurations
│   ├── routes.ts               # Application routes
│   ├── colors.ts               # Color constants
│   ├── animations.ts           # Animation configurations
│   └── features.ts             # Feature flags
│
├── types/                       # TypeScript type definitions
│   ├── analysis.ts             # Analysis-related types
│   ├── user.ts                 # User-related types
│   ├── billing.ts              # Billing-related types
│   ├── api.ts                  # API response types
│   ├── visualization.ts        # Visualization types
│   └── common.ts               # Common types
│
└── config/                      # Configuration files
    ├── env.ts                  # Environment configuration
    ├── database.ts             # Database configuration
    ├── stripe.ts               # Stripe configuration
    └── websocket.ts            # WebSocket configuration
```

**Styles Directory Organization**
```
styles/
├── globals.css                  # Global styles and Tailwind imports
├── components.css               # Component-specific styles
├── animations.css               # Animation keyframes and effects
├── utilities.css                # Custom utility classes
└── themes/
    ├── dark.css                # Dark theme variables
    ├── light.css               # Light theme variables
    └── custom-properties.css    # CSS custom properties
```

**Public Assets Structure**
```
public/
├── icons/                       # Application icons
│   ├── logo.svg
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   └── analysis-stages/         # Stage-specific icons
│       ├── collecting.svg
│       ├── filtering.svg
│       ├── analyzing.svg
│       └── completed.svg
│
├── images/                      # Static images
│   ├── hero-bg.svg             # Landing page hero background
│   ├── constellation-bg.svg    # Constellation map background
│   └── marketing/              # Marketing page images
│
├── workers/                     # Web Workers
│   ├── force-simulation.worker.js  # Constellation physics
│   ├── data-processing.worker.js   # Heavy data processing
│   └── websocket.worker.js         # WebSocket management
│
├── sounds/                      # Audio files
│   ├── notification.mp3        # Analysis completion sound
│   ├── error.mp3              # Error notification sound
│   └── voice-interface/        # Voice interface sounds
│       ├── start-listening.mp3
│       └── stop-listening.mp3
│
└── manifest.json               # PWA manifest
```

### File Naming Conventions

**Component Files**
- React components: PascalCase (e.g., `AnalysisCard.tsx`)
- Component directories: kebab-case (e.g., `constellation-map/`)
- Hook files: camelCase with "use" prefix (e.g., `useAnalysis.ts`)
- Utility files: kebab-case (e.g., `date-formatter.ts`)

**Directory Naming Standards**
- Route directories: kebab-case (e.g., `forgot-password/`)
- Component directories: kebab-case (e.g., `visualization/`)
- Route groups: parentheses (e.g., `(auth)/`, `(dashboard)/`)

**Import Organization Standards**
```typescript
// External library imports (alphabetical)
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Internal imports (by proximity/dependency)
import { validateAnalysisRequest } from '@/lib/validation/analysis-schema'
import { createAnalysis } from '@/lib/api/analysis'
import { requireAuth } from '@/lib/auth/auth-guard'

// Relative imports
import { AnalysisCard } from './AnalysisCard'
import { LoadingSpinner } from '../common/LoadingSpinner'
```

### Configuration Files Structure

**Package Management**
```json
// package.json - Development dependencies organization
{
  "dependencies": {
    // Framework dependencies
    "next": "14.0.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    
    // State management
    "zustand": "4.4.0",
    "@tanstack/react-query": "4.32.0",
    
    // UI libraries
    "@headlessui/react": "1.7.0",
    "@radix-ui/react-dialog": "1.0.0",
    "framer-motion": "10.16.0",
    
    // Visualization
    "d3": "7.8.0",
    "recharts": "2.8.0",
    
    // Forms and validation
    "react-hook-form": "7.45.0",
    "zod": "3.22.0",
    
    // Styling
    "tailwindcss": "3.3.0",
    "@emotion/react": "11.11.0",
    "@emotion/styled": "11.11.0"
  },
  "devDependencies": {
    // TypeScript
    "typescript": "5.1.0",
    "@types/react": "18.2.0",
    "@types/node": "20.0.0",
    
    // Testing
    "jest": "29.0.0",
    "@testing-library/react": "14.0.0",
    "@testing-library/jest-dom": "6.0.0",
    
    // Build tools
    "webpack-bundle-analyzer": "4.9.0",
    "eslint": "8.0.0",
    "prettier": "3.0.0"
  }
}
```

**Environment Configuration**
```typescript
// next.config.js
const nextConfig = {
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ['d3'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.reddit.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig
```

**TypeScript Configuration**
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["components/*"],
      "@/lib/*": ["lib/*"],
      "@/hooks/*": ["lib/hooks/*"],
      "@/types/*": ["lib/types/*"],
      "@/utils/*": ["lib/utils/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## 10. Component Architecture & Design System

### Design System Foundation

**Mercury.com-Inspired Design Language**
```typescript
// lib/design-system/tokens.ts
export const designTokens = {
  colors: {
    // Primary color palette - Professional fintech blues
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe', 
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9', // Primary brand color
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    // Success colors for cost tracking
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e', // Main success
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    // Warning colors for cost alerts
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b', // Main warning
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    // Error colors for failures
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444', // Main error
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    // Neutral colors for dark mode
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937', // Primary dark background
      900: '#111827', // Deeper dark background
      950: '#030712', // Darkest background
    },
  },
  
  // Constellation map specific tokens
  constellation: {
    node: {
      minSize: 4,
      maxSize: 20,
      colors: {
        high: '#22c55e',    // High opportunity score
        medium: '#f59e0b',  // Medium opportunity score
        low: '#6b7280',     // Low opportunity score
        selected: '#0ea5e9', // Selected node
      }
    },
    connection: {
      opacity: {
        weak: 0.1,
        medium: 0.3,
        strong: 0.6,
      },
      color: '#4b5563',
    }
  },
  
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
}
```

### Component Composition Patterns

**Analysis Card with Progressive Enhancement**
```typescript
// components/analysis/analysis-card.tsx
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressTracker } from '@/components/visualization/progress-tracker'
import { CostDisplay } from '@/components/billing/cost-display'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { Analysis } from '@/lib/types/analysis'

interface AnalysisCardProps {
  analysis: Analysis
  variant?: 'default' | 'compact' | 'detailed'
  showActions?: boolean
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({
  analysis,
  variant = 'default',
  showActions = true
}) => {
  const router = useRouter()
  
  const getStatusColor = (status: Analysis['status']) => {
    switch (status) {
      case 'completed': return 'success'
      case 'processing': return 'warning'
      case 'failed': return 'error'
      default: return 'secondary'
    }
  }
  
  const handleViewResults = () => {
    router.push(`/analysis/${analysis.id}`)
  }
  
  const handleViewConstellation = () => {
    router.push(`/analysis/${analysis.id}/constellation`)
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-6 hover:shadow-lg transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {analysis.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {analysis.subreddits.join(', ')} • {analysis.timeRange}
            </p>
          </div>
          <Badge variant={getStatusColor(analysis.status)}>
            {analysis.status}
          </Badge>
        </div>
        
        {/* Progress or Results Summary */}
        {analysis.status === 'processing' ? (
          <div className="mb-4">
            <ProgressTracker 
              currentStage={analysis.currentStage}
              progress={analysis.progress}
            />
          </div>
        ) : analysis.status === 'completed' && variant !== 'compact' ? (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {analysis.results?.totalOpportunities || 0}
              </div>
              <div className="text-sm text-gray-500">Opportunities</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success-600">
                {analysis.results?.avgOpportunityScore || 0}
              </div>
              <div className="text-sm text-gray-500">Avg Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning-600">
                {analysis.results?.antiPatterns || 0}
              </div>
              <div className="text-sm text-gray-500">Warnings</div>
            </div>
          </div>
        ) : null}
        
        {/* Cost Information */}
        <div className="flex items-center justify-between mb-4">
          <CostDisplay 
            amount={analysis.totalCost}
            label="Total Cost"
            variant="compact"
          />
          <div className="text-sm text-gray-500">
            {new Date(analysis.createdAt).toLocaleDateString()}
          </div>
        </div>
        
        {/* Actions */}
        {showActions && (
          <div className="flex gap-2">
            {analysis.status === 'completed' && (
              <>
                <Button 
                  onClick={handleViewResults}
                  className="flex-1"
                >
                  View Results
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleViewConstellation}
                >
                  Constellation
                </Button>
              </>
            )}
            {analysis.status === 'processing' && (
              <Button 
                variant="outline" 
                disabled
                className="flex-1"
              >
                Processing...
              </Button>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  )
}
```

**Constellation Node Component**
```typescript
// components/visualization/constellation/constellation-node.tsx
import { motion } from 'framer-motion'
import { memo, useCallback, useState } from 'react'
import { Tooltip } from '@/components/ui/tooltip'
import type { OpportunityNode } from '@/lib/types/analysis'

interface ConstellationNodeProps {
  node: OpportunityNode
  isSelected: boolean
  onSelect: (node: OpportunityNode) => void
  onHover: (node: OpportunityNode | null) => void
  scale: number
}

export const ConstellationNode = memo<ConstellationNodeProps>(({
  node,
  isSelected,
  onSelect,
  onHover,
  scale
}) => {
  const [isHovered, setIsHovered] = useState(false)
  
  const handleClick = useCallback(() => {
    onSelect(node)
  }, [node, onSelect])
  
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    onHover(node)
  }, [node, onHover])
  
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    onHover(null)
  }, [onHover])
  
  const getNodeColor = (score: number) => {
    if (score >= 80) return '#22c55e' // High opportunity
    if (score >= 60) return '#f59e0b' // Medium opportunity
    return '#6b7280' // Low opportunity
  }
  
  const nodeRadius = Math.max(4, Math.min(20, node.opportunityScore / 5)) * scale
  const strokeWidth = isSelected ? 3 : isHovered ? 2 : 1
  
  return (
    <Tooltip
      content={
        <div className="text-sm">
          <div className="font-medium">{node.title}</div>
          <div className="text-gray-400">Score: {node.opportunityScore}</div>
          <div className="text-gray-400">{node.category}</div>
        </div>
      }
    >
      <motion.g
        initial={{ opacity: 0, scale: 0 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          x: node.x,
          y: node.y 
        }}
        transition={{ 
          type: 'spring', 
          stiffness: 300, 
          damping: 30,
          x: { type: 'tween', duration: 0.3 },
          y: { type: 'tween', duration: 0.3 }
        }}
        style={{ cursor: 'pointer' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {/* Node circle */}
        <circle
          r={nodeRadius}
          fill={getNodeColor(node.opportunityScore)}
          stroke={isSelected ? '#0ea5e9' : 'transparent'}
          strokeWidth={strokeWidth}
          opacity={isHovered ? 0.9 : 0.7}
        />
        
        {/* Pulse effect for high-value nodes */}
        {node.opportunityScore >= 80 && (
          <motion.circle
            r={nodeRadius}
            fill="none"
            stroke={getNodeColor(node.opportunityScore)}
            strokeWidth="1"
            opacity="0.6"
            animate={{
              r: [nodeRadius, nodeRadius * 1.5, nodeRadius],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
        
        {/* Score label for high-scoring nodes */}
        {node.opportunityScore >= 70 && (
          <text
            textAnchor="middle"
            dy="0.3em"
            fontSize={Math.min(10, nodeRadius / 2)}
            fill="white"
            fontWeight="bold"
          >
            {node.opportunityScore}
          </text>
        )}
      </motion.g>
    </Tooltip>
  )
})

ConstellationNode.displayName = 'ConstellationNode'
```

### Accessibility & Performance Patterns

**Cost Crystallization Component**
```typescript
// components/visualization/cost-crystallizer.tsx
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface CostCrystallizerProps {
  currentCost: number
  targetCost?: number
  isProcessing: boolean
  className?: string
}

export const CostCrystallizer: React.FC<CostCrystallizerProps> = ({
  currentCost,
  targetCost,
  isProcessing,
  className
}) => {
  const controls = useAnimationControls()
  const shouldReduceMotion = useReducedMotion()
  const [crystals, setCrystals] = useState<Array<{ id: string; delay: number; size: number }>>([])
  
  useEffect(() => {
    if (isProcessing && !shouldReduceMotion) {
      // Generate crystal formation animation
      const newCrystals = Array.from({ length: 8 }, (_, i) => ({
        id: `crystal-${i}`,
        delay: i * 0.1,
        size: 0.5 + Math.random() * 0.5,
      }))
      setCrystals(newCrystals)
      
      controls.start('processing')
    } else {
      controls.start('idle')
    }
  }, [isProcessing, controls, shouldReduceMotion])
  
  const formatCurrency = (amount: number) => `$${amount.toFixed(4)}`
  
  return (
    <div className={cn('relative flex items-center justify-center p-8', className)}>
      {/* Central cost display */}
      <motion.div
        className="relative z-10 rounded-2xl bg-gray-900/90 backdrop-blur-sm border border-gray-700 p-6 text-center"
        animate={shouldReduceMotion ? undefined : controls}
        variants={{
          idle: { scale: 1, rotate: 0 },
          processing: { 
            scale: [1, 1.05, 1],
            rotate: [0, 1, 0],
            transition: { duration: 2, repeat: Infinity }
          }
        }}
        role="status"
        aria-live="polite"
        aria-label={`Current cost: ${formatCurrency(currentCost)}`}
      >
        <div className="text-sm text-gray-400 mb-1">Current Cost</div>
        <div className="text-2xl font-bold text-white">
          {formatCurrency(currentCost)}
        </div>
        {targetCost && (
          <div className="text-xs text-gray-500 mt-1">
            Target: {formatCurrency(targetCost)}
          </div>
        )}
      </motion.div>
      
      {/* Crystallization particles - Only show if motion is not reduced */}
      {!shouldReduceMotion && crystals.map((crystal) => (
        <motion.div
          key={crystal.id}
          className="absolute w-2 h-2 bg-primary-400 rounded-full"
          initial={{ opacity: 0, scale: 0, rotate: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, crystal.size, 0],
            rotate: [0, 180, 360],
            x: [0, Math.random() * 100 - 50],
            y: [0, Math.random() * 100 - 50],
          }}
          transition={{
            duration: 3,
            repeat: isProcessing ? Infinity : 0,
            delay: crystal.delay,
            ease: 'easeInOut',
          }}
          aria-hidden="true"
        />
      ))}
      
      {/* Background grid effect - Static version for reduced motion */}
      <div className="absolute inset-0 opacity-20" aria-hidden="true">
        <div className={cn(
          "w-full h-full bg-gradient-to-r from-transparent via-primary-500/10 to-transparent",
          !shouldReduceMotion && "animate-pulse"
        )} />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <defs>
            <pattern
              id="dot-grid"
              x="0"
              y="0"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="5" cy="5" r="0.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#dot-grid)" />
        </svg>
      </div>
    </div>
  )
}
```

## 11. State Management Architecture

### Zustand + TanStack Query Pattern

**Global Application State**
```typescript
// lib/stores/app-store.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface AppState {
  user: User | null
  isAuthenticated: boolean
  theme: 'light' | 'dark' | 'system'
  currentAnalysis: string | null
  costAccumulator: {
    [analysisId: string]: {
      current: number
      limit: number
      lastUpdate: number
    }
  }
  features: {
    voiceInterface: boolean
    constellationMap: boolean
    betaFeatures: boolean
  }
}

const useAppStore = create<AppState & Actions>()(
  subscribeWithSelector(
    immer((set, get) => ({
      user: null,
      isAuthenticated: false,
      theme: 'system',
      currentAnalysis: null,
      costAccumulator: {},
      features: {
        voiceInterface: true,
        constellationMap: true,
        betaFeatures: false,
      },
      
      updateCost: (analysisId, amount) => {
        set((state) => {
          if (state.costAccumulator[analysisId]) {
            state.costAccumulator[analysisId].current += amount
            state.costAccumulator[analysisId].lastUpdate = Date.now()
          }
        })
      },
    }))
  )
)
```

**TanStack Query Integration**
```typescript
// lib/api/queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import { useAppStore } from '@/lib/stores/app-store'

export const analysisKeys = {
  all: ['analyses'] as const,
  lists: () => [...analysisKeys.all, 'list'] as const,
  detail: (id: string) => [...analysisKeys.all, 'detail', id] as const,
}

export const useCreateAnalysis = () => {
  const queryClient = useQueryClient()
  const startCostTracking = useAppStore(state => state.startCostTracking)
  
  return useMutation({
    mutationFn: (config: AnalysisConfiguration) => 
      apiClient.post('/analyses', config),
    
    onSuccess: (data) => {
      startCostTracking(data.id, data.configuration.maxCost)
      queryClient.invalidateQueries({ queryKey: analysisKeys.lists() })
    },
  })
}
```

---

## 12. API Integration Patterns

### Service Layer Architecture

```typescript
// lib/api/client.ts
class ApiClient {
  private client: AxiosInstance
  
  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      timeout: 30000,
    })
    
    this.setupInterceptors()
  }
  
  private setupInterceptors() {
    this.client.interceptors.request.use((config) => {
      const token = TokenManager.getAccessToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })
    
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          const newToken = await this.refreshToken()
          error.config.headers.Authorization = `Bearer ${newToken}`
          return this.client.request(error.config)
        }
        return Promise.reject(this.handleError(error))
      }
    )
  }
  
  private handleError(error: AxiosError): ApiError {
    const message = error.response?.data?.message || 'An error occurred'
    const status = error.response?.status || 500
    const code = error.response?.data?.code || 'UNKNOWN_ERROR'
    
    return new ApiError(message, status, code)
  }
}
```

---

## 13. Testing Strategy & Quality Assurance

### Testing Philosophy

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

### Accessibility Testing

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

## 14. Deployment & Infrastructure

### Production Deployment Strategy

**Vercel Configuration**
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "nodejs18.x",
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/health",
      "destination": "/api/health"
    }
  ]
}
```

**Environment Configuration**
```bash
# Production Environment Variables
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_API_URL=https://api.saasopportunity.com/v1
NEXT_PUBLIC_WEBSOCKET_URL=https://realtime.saasopportunity.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_SENTRY_DSN=https://...

# Feature flags
NEXT_PUBLIC_ENABLE_VOICE_INTERFACE=true
NEXT_PUBLIC_ENABLE_CONSTELLATION_MAP=true
NEXT_PUBLIC_ENABLE_BETA_FEATURES=false
```

**CI/CD Pipeline**
```yaml
# .github/workflows/production-deploy.yml
name: Production Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.PRODUCTION_API_URL }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Monitoring & Observability

**Error Tracking with Sentry**
```typescript
// lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter sensitive data
    if (event.request?.data) {
      delete event.request.data.password
      delete event.request.data.token
    }
    return event
  },
  integrations: [
    new Sentry.BrowserTracing(),
  ],
})
```

**Performance Monitoring**
```typescript
// lib/monitoring/performance.ts
export const trackPerformance = (name: string, fn: () => Promise<any>) => {
  return async (...args: any[]) => {
    const start = performance.now()
    
    try {
      const result = await fn.apply(this, args)
      const duration = performance.now() - start
      
      // Track to analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'timing_complete', {
          name,
          value: Math.round(duration),
        })
      }
      
      return result
    } catch (error) {
      Sentry.captureException(error)
      throw error
    }
  }
}
```

---

## Conclusion & Next Steps

### Implementation Roadmap

**Phase 1: Foundation (Weeks 1-2)**
- Set up Next.js 14 project with App Router
- Implement basic authentication and routing
- Create core component library and design system
- Set up Zustand stores and TanStack Query

**Phase 2: Core Features (Weeks 3-5)**
- Build analysis configuration forms
- Implement real-time cost tracking
- Create basic result displays and data tables
- Add WebSocket integration for live updates

**Phase 3: Advanced Features (Weeks 6-8)**
- Develop constellation map visualization with D3.js
- Implement voice interface with Web Speech API
- Add comprehensive error handling and loading states
- Integrate Stripe payment processing

**Phase 4: Polish & Launch (Weeks 9-10)**
- Comprehensive testing and accessibility audit
- Performance optimization and bundle analysis
- Production deployment and monitoring setup
- Documentation and team handoff

### Key Development Principles

1. **Progressive Enhancement**: Core functionality works without JavaScript, enhanced features gracefully degrade
2. **Performance First**: Bundle budgets enforced, lazy loading implemented, real-time features optimized
3. **Accessibility by Design**: WCAG AA compliance built-in, comprehensive screen reader support
4. **Type Safety**: Strict TypeScript configuration, runtime validation with Zod
5. **Scalable Architecture**: Component composition patterns, clear separation of concerns
6. **Developer Experience**: Comprehensive tooling, clear documentation, automated quality checks

### Technical Debt Prevention

- Automated bundle size monitoring with CI/CD integration
- Regular dependency updates and security audits
- Code quality gates with ESLint, Prettier, and TypeScript strict mode
- Comprehensive test coverage with automated accessibility testing
- Performance budgets and Core Web Vitals monitoring

### Success Metrics

- **Performance**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Accessibility**: WCAG AA compliance, keyboard navigation support
- **Developer Experience**: <5 minute local setup, comprehensive TypeScript coverage
- **User Experience**: <100ms interaction response times, 60fps animations
- **Business Metrics**: >90% analysis completion rate, <5% payment failures

This comprehensive frontend architecture provides a solid foundation for building a sophisticated, scalable, and maintainable SaaS application with advanced features like real-time cost tracking, constellation map visualizations, and voice interfaces while maintaining excellent performance and accessibility standards.

---