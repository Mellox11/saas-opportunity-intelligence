import { NextRequest, NextResponse } from 'next/server'
import { costEventSchema } from '@/lib/validation/cost-schema'
import { CostTrackingService } from '@/lib/services/cost-tracking.service'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validatedEvent = costEventSchema.parse(body)
    
    // Record the cost event
    const trackingService = new CostTrackingService()
    await trackingService.recordCostEvent(validatedEvent)
    
    // Get updated tracking status
    const status = await trackingService.getCostTrackingStatus(validatedEvent.analysisId)
    
    return NextResponse.json({
      success: true,
      event: validatedEvent,
      trackingStatus: status
    })
    
  } catch (error) {
    console.error('Cost event recording error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid event data',
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to record cost event' },
      { status: 500 }
    )
  }
}