import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AnalysisOrchestrationService } from '@/lib/services/analysis-orchestration.service'
import { getServerSession } from 'next-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const analysisId = params.id

    // Verify analysis exists and user owns it
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId: session.user.id
      }
    })

    if (!analysis) {
      return new Response('Analysis not found', { status: 404 })
    }

    // Set up Server-Sent Events headers
    const encoder = new TextEncoder()
    const customReadable = new ReadableStream({
      start(controller) {
        // Send initial connection established event
        const data = `data: ${JSON.stringify({
          type: 'connected',
          analysisId,
          timestamp: new Date().toISOString()
        })}\n\n`
        controller.enqueue(encoder.encode(data))

        // Set up progress polling interval
        const orchestrationService = new AnalysisOrchestrationService()
        let lastProgress: any = null
        
        const sendProgress = async () => {
          try {
            const currentProgress = await orchestrationService.getAnalysisProgress(analysisId)
            
            // Only send update if progress has changed
            if (JSON.stringify(currentProgress) !== JSON.stringify(lastProgress)) {
              lastProgress = currentProgress
              
              const progressData = `data: ${JSON.stringify({
                type: 'progress',
                analysisId,
                progress: currentProgress,
                timestamp: new Date().toISOString()
              })}\n\n`
              
              controller.enqueue(encoder.encode(progressData))
            }
            
            // Check if analysis is complete
            const updatedAnalysis = await prisma.analysis.findUnique({
              where: { id: analysisId },
              select: { status: true }
            })
            
            if (updatedAnalysis?.status === 'completed' || 
                updatedAnalysis?.status === 'failed' || 
                updatedAnalysis?.status === 'cancelled') {
              
              // Send completion event
              const completionData = `data: ${JSON.stringify({
                type: 'completed',
                analysisId,
                finalStatus: updatedAnalysis.status,
                timestamp: new Date().toISOString()
              })}\n\n`
              
              controller.enqueue(encoder.encode(completionData))
              controller.close()
              clearInterval(interval)
            }
            
          } catch (error) {
            console.error('Error in progress stream:', error)
            const errorData = `data: ${JSON.stringify({
              type: 'error',
              analysisId,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString()
            })}\n\n`
            
            controller.enqueue(encoder.encode(errorData))
          }
        }
        
        // Poll for progress updates every 2 seconds
        const interval = setInterval(sendProgress, 2000)
        
        // Send initial progress
        sendProgress()
        
        // Clean up on client disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(interval)
          controller.close()
        })
      }
    })

    return new Response(customReadable, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })

  } catch (error) {
    console.error(`Progress stream error for ${params.id}:`, error)
    return new Response('Internal server error', { status: 500 })
  }
}