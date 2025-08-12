# 12. API Integration Patterns

## Service Layer Architecture

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
