import { NextRequest, NextResponse } from 'next/server'
import { costEstimateSchema } from '@/lib/validation/cost-schema'
import { generateCostEstimate } from '@/lib/utils/cost-calculator'
import { CostTrackingService } from '@/lib/services/cost-tracking.service'
import { z } from 'zod'
import { costEstimationRateLimiter, withRateLimit } from '@/lib/security/rate-limiter'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AppLogger } from '@/lib/observability/logger'

async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validatedData = costEstimateSchema.parse(body)
    
    // Get historical accuracy if user is authenticated
    let historicalAccuracy: number | undefined
    
    // Get user from NextAuth session
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      const trackingService = new CostTrackingService()
      historicalAccuracy = await trackingService.getHistoricalAccuracy(session.user.id)
      
      AppLogger.info('Cost estimate requested by authenticated user', {
        service: 'cost-estimate-api',
        operation: 'cost_estimate',
        userId: session.user.id,
        metadata: {
          hasHistoricalData: historicalAccuracy !== undefined
        }
      })
    }
    
    // Generate cost estimate
    const estimate = generateCostEstimate(
      validatedData.configuration,
      historicalAccuracy
    )
    
    // Check against budget limit if provided
    const response: any = {
      ...estimate,
      withinBudget: validatedData.budgetLimit 
        ? estimate.finalPrice <= validatedData.budgetLimit
        : null
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    AppLogger.error('Cost estimation error', {
      service: 'cost-estimate-api',
      operation: 'cost_estimate_error',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, error as Error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to generate cost estimate' },
      { status: 500 }
    )
  }
}

// Apply rate limiting to cost estimation endpoint
export const POST = withRateLimit(costEstimationRateLimiter)(handler)