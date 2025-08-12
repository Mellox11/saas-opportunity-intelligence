# 9. Project Structure & File Organization

## Next.js 14 App Router Structure

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

## File Naming Conventions

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

## Configuration Files Structure

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
