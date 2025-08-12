import { NextRequest, NextResponse } from 'next/server'
import { costEstimateSchema } from '@/lib/validation/cost-schema'
import { generateCostEstimate } from '@/lib/utils/cost-calculator'
import { CostTrackingService } from '@/lib/services/cost-tracking.service'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validatedData = costEstimateSchema.parse(body)
    
    // Get historical accuracy if user is authenticated
    let historicalAccuracy: number | undefined
    
    // TODO: Get user from session/JWT when auth is implemented
    // const session = await getServerSession()
    // if (session?.user?.id) {
    //   const trackingService = new CostTrackingService()
    //   historicalAccuracy = await trackingService.getHistoricalAccuracy(session.user.id)
    // }
    
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
    console.error('Cost estimation error:', error)
    
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