# 7. Security Considerations

## Authentication & Authorization

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

## API Security Implementation

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

## Data Protection & Privacy

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
