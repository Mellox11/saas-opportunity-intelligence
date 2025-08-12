import { Job } from 'bull'
import { AIProcessingService } from '@/lib/services/ai-processing.service'

export interface AIProcessingJobData {
  analysisId: string
  posts: Array<{
    id: string
    title: string
    content: string | null
    subreddit: string
    score: number
    numComments: number
    comments: Array<{
      content: string
      score: number
    }>
  }>
  batchSize: number
}

export const processAIJob = async (job: Job<AIProcessingJobData>) => {
  const { analysisId, posts, batchSize } = job.data
  
  console.log(`Starting AI processing for analysis ${analysisId} with ${posts.length} posts`)
  
  try {
    await job.progress(10)
    
    const aiService = new AIProcessingService(analysisId)
    
    // Process posts in batches
    await aiService.processPosts(posts, batchSize)
    
    await job.progress(100)
    
    console.log(`AI processing completed for analysis ${analysisId}`)
    
    return {
      success: true,
      postsProcessed: posts.length
    }
  } catch (error) {
    console.error(`AI processing failed for analysis ${analysisId}:`, error)
    throw error
  }
}