'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface User {
  id: string
  email: string
  name: string
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'GET',
          credentials: 'include',
        })
        
        if (response.ok) {
          const result = await response.json()
          setUser(result.user)
        } else {
          router.push('/login')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }
    
    checkAuth()
  }, [router])
  
  const handleLogout = async () => {
    try {
      // Set logging out state for UI feedback
      setIsLoggingOut(true)
      
      // Clear user state immediately to prevent UI inconsistencies
      setUser(null)
      
      // Clear any cached data in localStorage/sessionStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user')
        localStorage.removeItem('auth-token')
        sessionStorage.clear()
      }

      // Call logout API with proper error handling
      const response = await fetch('/api/auth/logout', { 
        method: 'POST', 
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        console.warn('Logout API returned non-OK status:', response.status)
        // Continue with client-side cleanup even if server-side fails
      }

      // Force clear cookies on client side as fallback
      if (typeof document !== 'undefined') {
        const expiredDate = 'Thu, 01 Jan 1970 00:00:00 GMT'
        const cookieOptions = `; expires=${expiredDate}; path=/; SameSite=Lax${
          window.location.protocol === 'https:' ? '; Secure' : ''
        }`
        
        document.cookie = `session-token=${cookieOptions}`
        document.cookie = `auth-token=${cookieOptions}`
      }

      // Redirect to login page
      router.push('/login')
      
    } catch (error) {
      console.error('Logout error:', error)
      
      // Even if logout fails, clear client state and redirect
      setUser(null)
      
      // Force clear cookies as fallback
      if (typeof document !== 'undefined') {
        const expiredDate = 'Thu, 01 Jan 1970 00:00:00 GMT'
        const cookieOptions = `; expires=${expiredDate}; path=/; SameSite=Lax`
        document.cookie = `session-token=${cookieOptions}`
        document.cookie = `auth-token=${cookieOptions}`
      }
      
      // Still redirect to login to prevent user from being stuck
      router.push('/login')
    } finally {
      setIsLoggingOut(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }
  
  if (!user) {
    return null
  }
  
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="bg-zinc-900/50 border-b border-zinc-800/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-semibold text-white hover:text-blue-400 transition-colors">
                SaaS Opportunity Intelligence
              </Link>
            </div>
            
            <div className="flex items-center space-x-1">
              <Link
                href="/dashboard"
                className="text-zinc-300 hover:text-white hover:bg-zinc-800/50 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              >
                Dashboard
              </Link>
              <Link
                href="/analysis/new"
                className="text-zinc-300 hover:text-white hover:bg-zinc-800/50 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              >
                New Analysis
              </Link>
              <Link
                href="/settings/profile"
                className="text-zinc-300 hover:text-white hover:bg-zinc-800/50 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              >
                Profile
              </Link>
              <Button
                variant="ghost"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-zinc-300 hover:text-white hover:bg-zinc-800/50 ml-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingOut ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {children}
        </div>
      </main>
    </div>
  )
}