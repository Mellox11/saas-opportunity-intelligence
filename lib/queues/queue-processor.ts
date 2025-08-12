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

// Process analysis jobs
analysisQueue.process('process-analysis', 1, processAnalysisJob)

// Process Reddit collection jobs  
redditCollectionQueue.process('collect-posts', 2, processRedditCollectionJob)

// Process AI processing jobs
aiProcessingQueue.process('process-posts', 1, processAIJob)

// Process report generation jobs
reportGenerationQueue.process('generate-report', 1, processReportGenerationJob)

// Error handling
analysisQueue.on('failed', (job, err) => {
  console.error(`Analysis job ${job.id} failed:`, err.message)
})

redditCollectionQueue.on('failed', (job, err) => {
  console.error(`Reddit collection job ${job.id} failed:`, err.message)
})

aiProcessingQueue.on('failed', (job, err) => {
  console.error(`AI processing job ${job.id} failed:`, err.message)
})

reportGenerationQueue.on('failed', (job, err) => {
  console.error(`Report generation job ${job.id} failed:`, err.message)
})

// Success logging
analysisQueue.on('completed', (job, result) => {
  console.log(`Analysis job ${job.id} completed:`, result)
})

redditCollectionQueue.on('completed', (job, result) => {
  console.log(`Reddit collection job ${job.id} completed:`, result)
})

aiProcessingQueue.on('completed', (job, result) => {
  console.log(`AI processing job ${job.id} completed:`, result)
})

reportGenerationQueue.on('completed', (job, result) => {
  console.log(`Report generation job ${job.id} completed:`, result)
})

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