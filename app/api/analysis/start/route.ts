import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { AnalysisOrchestrationService } from '@/lib/services/analysis-orchestration.service'
import { AuthService } from '@/lib/auth/jwt'
import { cookies } from 'next/headers'
import { createCorrelatedLogger } from '@/lib/middleware/correlation'
import { AppLogger } from '@/lib/observability/logger'
import { analysisRateLimiter, withRateLimit } from '@/lib/security/rate-limiter'

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

async function handler(request: NextRequest) {
  const logger = createCorrelatedLogger('api', 'start_analysis')
  const startTime = performance.now()
  
  try {
    logger.info('Analysis start request received')

    // Check authentication using the custom JWT system
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) {
      logger.warn('Unauthorized analysis start attempt - no token')
      
      AppLogger.auth('Unauthorized analysis start attempt', {
        service: 'api',
        operation: 'start_analysis',
        authEvent: 'failed_login',
        success: false
      })

      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = AuthService.verifyToken(token)
    if (!user) {
      logger.warn('Unauthorized analysis start attempt - invalid token')
      
      AppLogger.auth('Unauthorized analysis start attempt', {
        service: 'api',
        operation: 'start_analysis',
        authEvent: 'failed_login',
        success: false
      })

      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    logger.info('User authenticated for analysis start', {
      userId: user.userId
    })

    const body = await request.json()
    logger.debug('Request body parsed', {
      metadata: {
        subredditCount: body.subreddits?.length,
        timeRange: body.timeRange,
        maxCost: body.maxCost
      }
    })

    const validationResult = startAnalysisSchema.safeParse(body)
    
    if (!validationResult.success) {
      logger.warn('Request validation failed', {
        metadata: {
          validationErrors: validationResult.error.issues
        }
      })

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

    logger.info('Validated request data', {
      userId: user.userId,
      metadata: {
        subreddits,
        timeRange,
        keywordCount: keywords.predefined.length + keywords.custom.length,
        maxCost
      }
    })

    // Create analysis record
    const analysis = await prisma.analysis.create({
      data: {
        userId: user.userId,
        status: 'pending',
        configuration: JSON.stringify({
          subreddits,
          timeRange,
          keywords,
          maxCost
        }),
        estimatedCost: Math.min(maxCost * 0.8, 20), // Conservative estimate
        budgetLimit: maxCost,
        progress: JSON.stringify({
          stage: 'initializing',
          message: 'Analysis queued for processing',
          percentage: 0
        })
      }
    })

    logger.info('Analysis record created', {
      analysisId: analysis.id,
      userId: user.userId,
      metadata: {
        estimatedCost: analysis.estimatedCost,
        budgetLimit: analysis.budgetLimit
      }
    })

    // Start analysis pipeline
    const orchestrationService = new AnalysisOrchestrationService()
    
    try {
      const jobId = await orchestrationService.startAnalysis({
        analysisId: analysis.id,
        userId: user.userId,
        configuration: {
          subreddits,
          timeRange, 
          keywords,
          maxCost
        }
      })

      const duration = performance.now() - startTime
      logger.performance('Analysis start completed successfully', duration, {
        analysisId: analysis.id,
        userId: user.userId,
        metadata: {
          jobId
        }
      })

      // Adjust estimated completion based on processing mode
      const useDirectProcessing = process.env.ENABLE_DIRECT_PROCESSING === 'true'
      const estimatedMinutes = useDirectProcessing ? 5 : 10 // Direct processing is faster
      
      return NextResponse.json({
        success: true,
        analysisId: analysis.id,
        jobId,
        estimatedCompletion: new Date(Date.now() + estimatedMinutes * 60 * 1000),
        message: 'Analysis started successfully',
        processingMode: useDirectProcessing ? 'direct' : 'queue'
      })

    } catch (orchestrationError) {
      logger.error('Orchestration service failed', {
        analysisId: analysis.id,
        userId: user.userId
      }, orchestrationError as Error)

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
    const duration = performance.now() - startTime
    logger.error('Analysis start request failed', { duration }, error as Error)
    
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

// Apply rate limiting to analysis start endpoint
export const POST = withRateLimit(analysisRateLimiter, {
  keyGenerator: (req: NextRequest) => {
    // Rate limit by IP to prevent abuse while allowing legitimate users
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
              req.headers.get('x-real-ip') || 
              'unknown'
    return `analysis:${ip}`
  },
  onLimitReached: (identifier, result) => {
    AppLogger.business('Analysis rate limit exceeded', {
      service: 'api',
      operation: 'analysis_rate_limit_exceeded',
      businessEvent: 'security_event',
      metadata: {
        identifier,
        count: result.count,
        maxRequests: 10,
        windowMs: 60 * 60 * 1000 // 1 hour
      }
    })
  }
})(handler)