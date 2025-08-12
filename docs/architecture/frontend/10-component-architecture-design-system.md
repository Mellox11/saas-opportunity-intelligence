# 10. Component Architecture & Design System

## Design System Foundation

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

## Component Composition Patterns

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

## Accessibility & Performance Patterns

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
