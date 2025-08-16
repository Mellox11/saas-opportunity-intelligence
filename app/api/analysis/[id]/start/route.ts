import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AnalysisOrchestrationService } from '@/lib/services/analysis-orchestration.service'
import { AuthService } from '@/lib/auth/jwt'
import { cookies } from 'next/headers'
import { createCorrelatedLogger } from '@/lib/middleware/correlation'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logger = createCorrelatedLogger('api', 'execute_analysis')
  
  try {
    // Check authentication using the custom JWT system
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = AuthService.verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const analysisId = params.id

    // Get and verify analysis ownership and status
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId: user.userId
      },
      select: {
        id: true,
        status: true,
        configuration: true,
        estimatedCost: true,
        budgetLimit: true
      }
    })

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'Analysis not found' },
        { status: 404 }
      )
    }

    // Check if analysis is ready to execute (cost approved)
    if (analysis.status !== 'cost_approved') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Analysis cannot be executed. Current status: ${analysis.status}`,
          currentStatus: analysis.status
        },
        { status: 400 }
      )
    }

    logger.info('Starting analysis execution', {
      analysisId,
      userId: user.userId,
      metadata: {
        estimatedCost: analysis.estimatedCost,
        budgetLimit: analysis.budgetLimit
      }
    })

    // Parse configuration and start analysis
    const configuration = JSON.parse(analysis.configuration)
    
    const orchestrationService = new AnalysisOrchestrationService()
    
    try {
      const jobId = await orchestrationService.startAnalysis({
        analysisId: analysis.id,
        userId: user.userId,
        configuration: {
          subreddits: configuration.subreddits,
          timeRange: configuration.timeRange,
          keywords: configuration.keywords || { predefined: [], custom: [] },
          maxCost: analysis.budgetLimit || analysis.estimatedCost || 25
        }
      })

      logger.info('Analysis execution started successfully', {
        analysisId,
        userId: user.userId,
        metadata: {
          jobId
        }
      })

      // Determine processing mode for response
      const useDirectProcessing = process.env.ENABLE_DIRECT_PROCESSING === 'true'
      const estimatedMinutes = useDirectProcessing ? 5 : 10

      return NextResponse.json({
        success: true,
        message: 'Analysis execution started successfully',
        jobId,
        analysisId: analysis.id,
        estimatedCompletion: new Date(Date.now() + estimatedMinutes * 60 * 1000),
        processingMode: useDirectProcessing ? 'direct' : 'queue'
      })

    } catch (orchestrationError) {
      logger.error('Failed to start analysis execution', {
        analysisId,
        userId: user.userId
      }, orchestrationError as Error)

      // Mark analysis as failed
      await prisma.analysis.update({
        where: { id: analysisId },
        data: { 
          status: 'failed',
          metadata: JSON.stringify({
            ...JSON.parse(analysis.configuration || '{}'),
            executionError: orchestrationError instanceof Error ? orchestrationError.message : 'Unknown error',
            failedAt: new Date().toISOString()
          })
        }
      })

      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to start analysis execution',
          message: orchestrationError instanceof Error ? orchestrationError.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    logger.error('Analysis execution request failed', {
      analysisId: params.id
    }, error as Error)
    
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