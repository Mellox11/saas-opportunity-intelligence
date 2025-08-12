# 5. Integration Patterns - Monolith + Workers Architecture

## Frontend-Backend Communication Architecture

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

## Worker Service Integration

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

## Microservice Communication Patterns

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

## API Contract Management

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
