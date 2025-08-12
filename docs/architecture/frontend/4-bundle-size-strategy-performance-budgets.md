# 4. Bundle Size Strategy & Performance Budgets

## Performance Budget Framework

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

## Bundle Splitting Strategy

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

## Loading Strategy Implementation

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

## Performance Monitoring Integration

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
