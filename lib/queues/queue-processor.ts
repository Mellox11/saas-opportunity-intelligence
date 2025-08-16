import { 
  analysisQueue, 
  redditCollectionQueue, 
  aiProcessingQueue, 
  reportGenerationQueue,
  shutdownQueues 
} from './queue-config'
import { processAnalysisJob } from './workers/analysis.worker'
import { processRedditCollectionJob } from './workers/reddit-collection.worker'
import { processAIJob } from './workers/ai-processing.worker'
import { processReportGenerationJob } from './workers/report-generation.worker'

// Setup queue processors only if queues are available
if (analysisQueue) {
  // Process analysis jobs
  analysisQueue.process('process-analysis', 1, processAnalysisJob)
  
  // Error handling
  analysisQueue.on('failed', (job, err) => {
    console.error(`Analysis job ${job.id} failed:`, err.message)
  })
}

if (redditCollectionQueue) {
  // Process Reddit collection jobs  
  redditCollectionQueue.process('collect-posts', 2, processRedditCollectionJob)
  
  redditCollectionQueue.on('failed', (job, err) => {
    console.error(`Reddit collection job ${job.id} failed:`, err.message)
  })
}

if (aiProcessingQueue) {
  // Process AI processing jobs
  aiProcessingQueue.process('process-posts', 1, processAIJob)
  
  aiProcessingQueue.on('failed', (job, err) => {
    console.error(`AI processing job ${job.id} failed:`, err.message)
  })
}

if (reportGenerationQueue) {
  // Process report generation jobs
  reportGenerationQueue.process('generate-report', 1, processReportGenerationJob)
  
  reportGenerationQueue.on('failed', (job, err) => {
    console.error(`Report generation job ${job.id} failed:`, err.message)
  })
}

// Success logging - only if queues are available
if (analysisQueue) {
  analysisQueue.on('completed', (job, result) => {
    console.log(`Analysis job ${job.id} completed:`, result)
  })
}

if (redditCollectionQueue) {
  redditCollectionQueue.on('completed', (job, result) => {
    console.log(`Reddit collection job ${job.id} completed:`, result)
  })
}

if (aiProcessingQueue) {
  aiProcessingQueue.on('completed', (job, result) => {
    console.log(`AI processing job ${job.id} completed:`, result)
  })
}

if (reportGenerationQueue) {
  reportGenerationQueue.on('completed', (job, result) => {
    console.log(`Report generation job ${job.id} completed:`, result)
  })
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')
  await shutdownQueues()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...')
  await shutdownQueues()
  process.exit(0)
})

console.log('Queue processors initialized')

export {
  analysisQueue,
  redditCollectionQueue, 
  aiProcessingQueue,
  reportGenerationQueue
}