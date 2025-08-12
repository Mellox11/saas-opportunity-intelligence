import { NextRequest, NextResponse } from 'next/server'
import { costApprovalSchema } from '@/lib/validation/cost-schema'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validatedData = costApprovalSchema.parse(body)
    
    // Update analysis with approval
    const analysis = await prisma.analysis.update({
      where: { id: validatedData.analysisId },
      data: {
        status: 'cost_approved',
        estimatedCost: validatedData.estimatedCost,
        budgetLimit: validatedData.approvedBudget,
        metadata: JSON.stringify({
          costApproved: true,
          approvedAt: new Date().toISOString(),
          acknowledged: validatedData.acknowledged
        })
      }
    })
    
    // TODO: Trigger analysis job in worker system
    // await triggerAnalysisJob(analysis.id)
    
    return NextResponse.json({
      success: true,
      analysisId: analysis.id,
      status: analysis.status,
      message: 'Cost approved. Analysis will begin shortly.'
    })
    
  } catch (error) {
    console.error('Cost approval error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to approve cost' },
      { status: 500 }
    )
  }
}