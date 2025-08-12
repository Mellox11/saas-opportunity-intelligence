import { NextRequest, NextResponse } from 'next/server'
import { CostTrackingService } from '@/lib/services/cost-tracking.service'

export async function GET(
  request: NextRequest,
  { params }: { params: { analysisId: string } }
) {
  try {
    const analysisId = params.analysisId
    
    if (!analysisId) {
      return NextResponse.json(
        { error: 'Analysis ID is required' },
        { status: 400 }
      )
    }
    
    const trackingService = new CostTrackingService()
    const trackingStatus = await trackingService.getCostTrackingStatus(analysisId)
    
    return NextResponse.json(trackingStatus)
    
  } catch (error) {
    console.error('Cost tracking error:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to get cost tracking status' },
      { status: 500 }
    )
  }
}