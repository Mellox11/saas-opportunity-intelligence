import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { AppLogger } from '@/lib/observability/logger'
import { verifyAuth } from '@/lib/auth/jwt'
import { createCorrelatedLogger } from '@/lib/middleware/correlation'

// Validation schema for dimension feedback
const dimensionFeedbackSchema = z.object({
  opportunityId: z.string().uuid('Invalid opportunity ID'),
  dimensionName: z.string().min(1, 'Dimension name is required'),
  userRating: z.enum(['positive', 'negative'], {
    required_error: 'User rating must be positive or negative'
  })
})

/**
 * Dimension Feedback API Endpoint
 * AC: 7 - User feedback mechanism (thumbs up/down) to validate scoring accuracy per dimension
 */
export async function POST(request: NextRequest) {
  const logger = createCorrelatedLogger('dimension-feedback-api', 'submit_feedback')
  
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.valid || !authResult.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = authResult.userId

    // Parse and validate request body
    const body = await request.json()
    const validatedData = dimensionFeedbackSchema.parse(body)
    
    const { opportunityId, dimensionName, userRating } = validatedData

    logger.info('Processing dimension feedback submission', {
      userId,
      opportunityId,
      dimensionName,
      userRating
    })

    // Verify opportunity exists and belongs to user
    const opportunity = await prisma.opportunity.findFirst({
      where: {
        id: opportunityId,
        analysis: {
          userId: userId
        }
      },
      include: {
        analysis: {
          select: { userId: true }
        }
      }
    })

    if (!opportunity) {
      logger.warn('Opportunity not found or access denied', {
        userId,
        opportunityId
      })
      return NextResponse.json(
        { error: 'Opportunity not found or access denied' },
        { status: 404 }
      )
    }

    // Check if user has already provided feedback for this dimension
    const existingFeedback = await prisma.dimensionFeedback.findUnique({
      where: {
        opportunityId_dimensionName_userId: {
          opportunityId,
          dimensionName,
          userId
        }
      }
    })

    if (existingFeedback) {
      // Update existing feedback
      const updatedFeedback = await prisma.dimensionFeedback.update({
        where: {
          id: existingFeedback.id
        },
        data: {
          userRating,
          updatedAt: new Date()
        }
      })

      logger.info('Dimension feedback updated', {
        feedbackId: updatedFeedback.id,
        userId,
        opportunityId,
        dimensionName,
        userRating,
        previousRating: existingFeedback.userRating
      })

      return NextResponse.json({
        success: true,
        feedback: {
          id: updatedFeedback.id,
          userRating: updatedFeedback.userRating,
          isUpdate: true
        }
      })
    } else {
      // Create new feedback
      const newFeedback = await prisma.dimensionFeedback.create({
        data: {
          opportunityId,
          dimensionName,
          userId,
          userRating,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      logger.info('Dimension feedback created', {
        feedbackId: newFeedback.id,
        userId,
        opportunityId,
        dimensionName,
        userRating
      })

      return NextResponse.json({
        success: true,
        feedback: {
          id: newFeedback.id,
          userRating: newFeedback.userRating,
          isUpdate: false
        }
      })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid dimension feedback data', {
        errors: error.errors
      })
      return NextResponse.json(
        { 
          error: 'Invalid data provided',
          details: error.errors
        },
        { status: 400 }
      )
    }

    logger.error('Failed to process dimension feedback', {
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error as Error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get dimension feedback for an opportunity
 */
export async function GET(request: NextRequest) {
  const logger = createCorrelatedLogger('dimension-feedback-api', 'get_feedback')
  
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.valid || !authResult.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = authResult.userId
    const { searchParams } = new URL(request.url)
    const opportunityId = searchParams.get('opportunityId')

    if (!opportunityId) {
      return NextResponse.json(
        { error: 'opportunityId parameter is required' },
        { status: 400 }
      )
    }

    // Verify opportunity access
    const opportunity = await prisma.opportunity.findFirst({
      where: {
        id: opportunityId,
        analysis: {
          userId: userId
        }
      }
    })

    if (!opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found or access denied' },
        { status: 404 }
      )
    }

    // Get all feedback for this opportunity from this user
    const feedback = await prisma.dimensionFeedback.findMany({
      where: {
        opportunityId,
        userId
      },
      select: {
        dimensionName: true,
        userRating: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Transform to map format for easy lookup
    const feedbackMap = feedback.reduce((acc, item) => {
      acc[item.dimensionName] = {
        userRating: item.userRating,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString()
      }
      return acc
    }, {} as Record<string, any>)

    logger.info('Retrieved dimension feedback', {
      userId,
      opportunityId,
      feedbackCount: feedback.length
    })

    return NextResponse.json({
      success: true,
      feedback: feedbackMap
    })

  } catch (error) {
    logger.error('Failed to retrieve dimension feedback', {
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error as Error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}