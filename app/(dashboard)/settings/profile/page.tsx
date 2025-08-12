'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateProfileSchema, type UpdateProfileInput } from '@/lib/validation/auth-schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface User {
  id: string
  email: string
  name: string
  company?: string
  createdAt: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
  })
  
  useEffect(() => {
    // Load user data from localStorage for now
    // In a real app, this would come from the API
    const token = localStorage.getItem('auth-token')
    if (token) {
      // Mock user data - in production this would be an API call
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        name: 'John Doe',
        company: 'Acme Inc',
        createdAt: new Date().toISOString(),
      }
      setUser(mockUser)
      reset({
        name: mockUser.name,
        company: mockUser.company || '',
      })
    }
  }, [reset])
  
  const onSubmit = async (data: UpdateProfileInput) => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)
    
    try {
      // Mock update - in production this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (user) {
        setUser({
          ...user,
          name: data.name,
          company: data.company || undefined,
        })
      }
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }
  
  if (!user) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-gray-400 mt-2">
          Manage your account information
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="bg-gray-800/50 border-gray-700 opacity-50"
                />
                <p className="text-xs text-gray-500">
                  Email cannot be changed
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  {...register('name')}
                  disabled={isLoading}
                  className="bg-gray-800/50 border-gray-700"
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company">Company (optional)</Label>
                <Input
                  id="company"
                  placeholder="Acme Inc."
                  {...register('company')}
                  disabled={isLoading}
                  className="bg-gray-800/50 border-gray-700"
                />
                {errors.company && (
                  <p className="text-sm text-red-500">{errors.company.message}</p>
                )}
              </div>
              
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="p-3 text-sm text-green-500 bg-green-500/10 border border-green-500/20 rounded">
                  Profile updated successfully
                </div>
              )}
              
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Updating...' : 'Update Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your account details and history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Account Created</Label>
              <p className="text-gray-400">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Analysis History</Label>
              <p className="text-gray-400">
                No analyses yet - start your first analysis to see your history here.
              </p>
            </div>
            
            <div className="pt-4 border-t border-gray-800">
              <h4 className="font-medium mb-2">Account Status</h4>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-400">Active</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}