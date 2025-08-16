'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  StopCircle,
  Activity,
  Zap,
  Wifi,
  WifiOff
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency, calculateBudgetStatus } from '@/lib/utils/cost-calculator'
import { CostTrackingUpdate } from '@/lib/validation/cost-schema'
import { cn } from '@/lib/utils'
import { useWebSocket, WebSocketEvent } from '@/lib/websocket/websocket-client'

interface CostTrackerProps {
  analysisId: string
  initialData?: CostTrackingUpdate
  onCircuitBreak?: () => void
  className?: string
}

export function CostTracker({
  analysisId,
  initialData,
  onCircuitBreak,
  className
}: CostTrackerProps) {
  const [trackingData, setTrackingData] = useState<CostTrackingUpdate | null>(initialData || null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [error, setError] = useState<string | null>(null)
  
  // Poll for updates (will be replaced with WebSocket in production)
  useEffect(() => {
    const fetchTrackingData = async () => {
      try {
        const response = await fetch(`/api/cost/tracking/${analysisId}`)
        if (response.ok) {
          const data = await response.json()
          setTrackingData(data)
          setLastUpdate(new Date())
          
          // Check for circuit breaker trigger
          if (data.status === 'stopped' && onCircuitBreak) {
            onCircuitBreak()
          }
        }
      } catch (error) {
        console.error('Failed to fetch tracking data:', error)
      }
    }
    
    // Initial fetch
    fetchTrackingData()
    
    // Poll every 2 seconds during active analysis
    const interval = setInterval(fetchTrackingData, 2000)
    
    return () => clearInterval(interval)
  }, [analysisId, onCircuitBreak])
  
  // WebSocket connection for real-time updates
  const { on, isConnected } = useWebSocket(analysisId)
  
  useEffect(() => {
    // Subscribe to WebSocket cost updates
    const unsubscribeCost = on<CostTrackingUpdate>(
      WebSocketEvent.COST_UPDATE,
      (data) => {
        setTrackingData(data)
        setError(null)
      }
    )
    
    const unsubscribeError = on<{ message: string }>(
      WebSocketEvent.ERROR,
      (data) => {
        setError(data.message)
      }
    )
    
    return () => {
      unsubscribeCost()
      unsubscribeError()
    }
  }, [on])
  // useEffect(() => {
  //   const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/cost-tracking/${analysisId}`)
  //   
  //   ws.onopen = () => setIsConnected(true)
  //   ws.onclose = () => setIsConnected(false)
  //   ws.onmessage = (event) => {
  //     const data = JSON.parse(event.data)
  //     setTrackingData(data)
  //     setLastUpdate(new Date())
  //   }
  //   
  //   return () => ws.close()
  // }, [analysisId])
  
  if (!trackingData) {
    return (
      <Card className={cn('p-6 bg-gray-800 border-gray-700', className)}>
        <div className="flex items-center justify-center text-gray-400">
          <Activity className="h-5 w-5 mr-2 animate-pulse" />
          <span>Initializing cost tracking...</span>
        </div>
      </Card>
    )
  }
  
  const { currentCost, estimatedCost, budgetLimit, percentComplete, status } = trackingData
  const costPercentOfEstimate = (currentCost / estimatedCost) * 100
  const costPercentOfBudget = (currentCost / budgetLimit) * 100
  
  const getStatusColor = () => {
    switch (status) {
      case 'exceeded':
      case 'stopped':
        return 'text-red-500'
      case 'approaching_limit':
        return 'text-yellow-500'
      default:
        return 'text-green-500'
    }
  }
  
  const getProgressColor = () => {
    switch (status) {
      case 'exceeded':
      case 'stopped':
        return 'bg-red-500'
      case 'approaching_limit':
        return 'bg-yellow-500'
      default:
        return 'bg-green-500'
    }
  }
  
  return (
    <Card className={cn('p-6 bg-gray-800 border-gray-700', className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-500" />
            Cost Tracking
          </h3>
          <div className="flex items-center gap-3">
            {isConnected() ? (
              <div className="flex items-center gap-1 text-xs text-green-500">
                <Wifi className="h-3 w-3" />
                <span>Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-yellow-500">
                <WifiOff className="h-3 w-3" />
                <span>Polling</span>
              </div>
            )}
            <div className={cn('text-sm font-medium', getStatusColor())}>
              {formatCurrency(currentCost)}
            </div>
          </div>
        </div>
        
        {/* Progress Bars */}
        <div className="space-y-3">
          {/* Cost vs Estimate */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Progress vs Estimate</span>
              <span className="text-gray-300">
                {costPercentOfEstimate.toFixed(0)}%
              </span>
            </div>
            <Progress 
              value={costPercentOfEstimate} 
              className="h-2 bg-gray-700"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatCurrency(currentCost)}</span>
              <span>{formatCurrency(estimatedCost)}</span>
            </div>
          </div>
          
          {/* Cost vs Budget */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Budget Usage</span>
              <span className={getStatusColor()}>
                {costPercentOfBudget.toFixed(0)}%
              </span>
            </div>
            <Progress 
              value={costPercentOfBudget} 
              className="h-2 bg-gray-700"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatCurrency(currentCost)}</span>
              <span>{formatCurrency(budgetLimit)}</span>
            </div>
          </div>
        </div>
        
        {/* Status Alerts */}
        <AnimatePresence mode="wait">
          {status === 'approaching_limit' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert className="bg-yellow-500/10 border-yellow-500/30">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-400">
                  Approaching budget limit. Analysis will stop at 95% of budget.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
          
          {status === 'stopped' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert className="bg-red-500/10 border-red-500/30">
                <StopCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-400">
                  Analysis stopped: Budget limit reached. 
                  Final cost: {formatCurrency(currentCost)}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Cost Breakdown */}
        <div className="pt-3 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Current Cost</span>
              <p className="text-lg font-semibold text-white">
                {formatCurrency(currentCost)}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Remaining Budget</span>
              <p className={cn('text-lg font-semibold', getStatusColor())}>
                {formatCurrency(Math.max(0, budgetLimit - currentCost))}
              </p>
            </div>
          </div>
        </div>
        
        {/* Last Update */}
        <div className="text-xs text-gray-500 text-center">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>
    </Card>
  )
}