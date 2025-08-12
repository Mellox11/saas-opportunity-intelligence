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
    // Clear the session cookie
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    router.push('/login')
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
                className="text-zinc-300 hover:text-white hover:bg-zinc-800/50 ml-2"
              >
                Sign out
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