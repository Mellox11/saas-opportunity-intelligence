import { Job } from 'bull'
import { RedditCollectionService } from '@/lib/services/reddit-collection.service'

export interface RedditCollectionJobData {
  analysisId: string
  subreddits: string[]
  timeRange: number
  keywords: {
    predefined: string[]
    custom: string[]
  }
}

export const processRedditCollectionJob = async (job: Job<RedditCollectionJobData>) => {
  const { analysisId, subreddits, timeRange, keywords } = job.data
  
  console.log(`Starting Reddit collection for analysis ${analysisId}`)
  
  try {
    // Update job progress
    await job.progress(10)
    
    const collectionService = new RedditCollectionService(analysisId)
    
    // Collect and store posts
    const result = await collectionService.collectAndStorePosts(
      subreddits,
      timeRange,
      keywords
    )
    
    await job.progress(100)
    
    console.log(`Reddit collection completed for analysis ${analysisId}:`, result)
    
    return {
      success: true,
      postsCollected: result.postsCollected,
      commentsCollected: result.commentsCollected
    }
  } catch (error) {
    console.error(`Reddit collection failed for analysis ${analysisId}:`, error)
    throw error
  }
}