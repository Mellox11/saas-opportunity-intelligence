# 8. Performance Optimization

## Real-time Feature Optimization

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

## Visualization Performance Optimization

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

## Memory Management and Cleanup

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
