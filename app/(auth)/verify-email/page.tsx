'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  useEffect(() => {
    if (token) {
      // Redirect to the API endpoint which will handle verification and redirect to login
      window.location.href = `/api/auth/verify-email?token=${token}`
    } else {
      setIsLoading(false)
    }
  }, [token])
  
  if (isLoading) {
    return (
      <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Verifying email...</CardTitle>
          <CardDescription className="text-center">
            Please wait while we verify your email address.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }
  
  if (!token) {
    return (
      <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Invalid verification link</CardTitle>
          <CardDescription className="text-center">
            This email verification link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Link href="/register" className="text-primary hover:underline">
            Register again
          </Link>
        </CardFooter>
      </Card>
    )
  }
  
  return null
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailForm />
    </Suspense>
  )
}