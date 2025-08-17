'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestAuthPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check debug endpoint
        const response = await fetch('/api/debug/auth')
        const data = await response.json()
        setDebugInfo(data)
        
        // Also check localStorage
        const localToken = localStorage.getItem('auth-token')
        setDebugInfo((prev: any) => ({
          ...prev,
          localStorage: {
            'auth-token': localToken ? `Present (${localToken.length} chars)` : 'Missing'
          }
        }))
      } catch (error) {
        setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' })
      } finally {
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [])
  
  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          )}
          
          <div className="mt-4 space-y-2">
            <h3 className="font-semibold">Quick Actions:</h3>
            <button
              onClick={() => window.location.href = '/login'}
              className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
            >
              Go to Login
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-green-500 text-white px-4 py-2 rounded mr-2"
            >
              Try Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-500 text-white px-4 py-2 rounded"
            >
              Refresh
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}