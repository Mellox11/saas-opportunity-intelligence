# 11. State Management Architecture

## Zustand + TanStack Query Pattern

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
