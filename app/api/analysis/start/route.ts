import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { AnalysisOrchestrationService } from '@/lib/services/analysis-orchestration.service'
import { getServerSession } from 'next-auth'

// Validation schema for start analysis request
const startAnalysisSchema = z.object({
  subreddits: z.array(z.string().min(1)).min(1).max(10),
  timeRange: z.number().int().min(1).max(365), // 1 day to 1 year
  keywords: z.object({
    predefined: z.array(z.string()).default([]),
    custom: z.array(z.string()).max(20).default([])
  }).default({}),
  maxCost: z.number().positive().max(100).default(25) // $25 default max
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validationResult = startAnalysisSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { subreddits, timeRange, keywords, maxCost } = validationResult.data

    // Create analysis record
    const analysis = await prisma.analysis.create({
      data: {
        userId: session.user.id,
        status: 'pending',
        configuration: {
          subreddits,
          timeRange,
          keywords,
          maxCost
        },
        estimatedCost: Math.min(maxCost * 0.8, 20), // Conservative estimate
        maxCost,
        progress: JSON.stringify({
          stage: 'initializing',
          message: 'Analysis queued for processing',
          percentage: 0
        })
      }
    })

    // Start analysis pipeline
    const orchestrationService = new AnalysisOrchestrationService()
    
    try {
      const jobId = await orchestrationService.startAnalysis({
        analysisId: analysis.id,
        userId: session.user.id,
        configuration: {
          subreddits,
          timeRange, 
          keywords,
          maxCost
        }
      })

      return NextResponse.json({
        success: true,
        analysisId: analysis.id,
        jobId,
        estimatedCompletion: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        message: 'Analysis started successfully'
      })

    } catch (orchestrationError) {
      // If orchestration fails, mark analysis as failed
      await prisma.analysis.update({
        where: { id: analysis.id },
        data: { 
          status: 'failed',
          progress: JSON.stringify({
            stage: 'failed',
            message: `Failed to start analysis: ${orchestrationError instanceof Error ? orchestrationError.message : 'Unknown error'}`,
            percentage: 0,
            error: orchestrationError instanceof Error ? orchestrationError.message : 'Unknown error'
          })
        }
      })

      throw orchestrationError
    }

  } catch (error) {
    console.error('Analysis start error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}