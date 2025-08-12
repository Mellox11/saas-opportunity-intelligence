import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

interface ApiError {
  message: string
  code?: string
  details?: any
}

export class ApiErrorHandler {
  static handleError(error: unknown, context: string = 'API'): NextResponse {
    console.error(`${context} error:`, error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      // Don't expose internal error details in production
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Unknown error occurred' },
      { status: 500 }
    )
  }

  static success(data: any, status: number = 200): NextResponse {
    return NextResponse.json(data, { status })
  }

  static validationError(message: string, details?: any): NextResponse {
    return NextResponse.json(
      { error: message, details },
      { status: 400 }
    )
  }

  static unauthorized(message: string = 'Unauthorized'): NextResponse {
    return NextResponse.json(
      { error: message },
      { status: 401 }
    )
  }

  static forbidden(message: string = 'Forbidden'): NextResponse {
    return NextResponse.json(
      { error: message },
      { status: 403 }
    )
  }

  static notFound(message: string = 'Not found'): NextResponse {
    return NextResponse.json(
      { error: message },
      { status: 404 }
    )
  }

  static rateLimited(retryAfter?: number): NextResponse {
    const response = NextResponse.json(
      { 
        error: 'Too many requests. Please try again later.',
        retryAfter 
      },
      { status: 429 }
    )
    
    if (retryAfter) {
      response.headers.set('Retry-After', Math.ceil(retryAfter / 1000).toString())
    }
    
    return response
  }
}