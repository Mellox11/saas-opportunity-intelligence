import Queue from 'bull'
import Redis from 'ioredis'

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  // For Railway/production deployment
  ...(process.env.REDIS_URL && {
    redis: process.env.REDIS_URL
  })
}

// Create Redis connection only if needed (for Epic 2+)
export const redis = process.env.REDIS_URL || process.env.ENABLE_QUEUES 
  ? new Redis(redisConfig)
  : null

// Queue names
export const QUEUE_NAMES = {
  ANALYSIS: 'analysis-processing',
  REDDIT_COLLECTION: 'reddit-collection',
  AI_PROCESSING: 'ai-processing',
  VECTOR_OPERATIONS: 'vector-operations',
  REPORT_GENERATION: 'report-generation'
} as const

// Queue options with retry logic and exponential backoff
const queueOptions = redis ? {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 10, // Keep only 10 completed jobs
    removeOnFail: 5, // Keep only 5 failed jobs
    ttl: 30 * 60 * 1000, // 30 minutes TTL
    delay: 0
  },
  settings: {
    stalledInterval: 30 * 1000, // Check for stalled jobs every 30 seconds
    maxStalledCount: 1 // Mark job as failed after 1 stall
  }
} : null

// Create queue instances only if Redis is available
export const analysisQueue = redis ? new Queue(QUEUE_NAMES.ANALYSIS, queueOptions!) : null
export const redditCollectionQueue = redis ? new Queue(QUEUE_NAMES.REDDIT_COLLECTION, queueOptions!) : null
export const aiProcessingQueue = redis ? new Queue(QUEUE_NAMES.AI_PROCESSING, queueOptions!) : null
export const vectorOperationsQueue = redis ? new Queue(QUEUE_NAMES.VECTOR_OPERATIONS, queueOptions!) : null
export const reportGenerationQueue = redis ? new Queue(QUEUE_NAMES.REPORT_GENERATION, queueOptions!) : null

// Export all queues for easy access
export const queues = {
  analysis: analysisQueue,
  redditCollection: redditCollectionQueue,
  aiProcessing: aiProcessingQueue,
  vectorOperations: vectorOperationsQueue,
  reportGeneration: reportGenerationQueue
}

// Graceful shutdown handler
export const shutdownQueues = async (): Promise<void> => {
  console.log('Shutting down queues...')
  await Promise.all([
    analysisQueue.close(),
    redditCollectionQueue.close(),
    aiProcessingQueue.close(),
    vectorOperationsQueue.close(),
    reportGenerationQueue.close(),
    redis.disconnect()
  ])
  console.log('All queues shut down successfully')
}

// Health check for queues
export const getQueueHealth = async () => {
  const health = await Promise.all(
    Object.entries(queues).map(async ([name, queue]) => {
      try {
        const waiting = await queue.getWaiting()
        const active = await queue.getActive()
        const completed = await queue.getCompleted()
        const failed = await queue.getFailed()
        
        return {
          name,
          status: 'healthy',
          counts: {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length
          }
        }
      } catch (error) {
        return {
          name,
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  )
  
  return health
}