import { Job } from 'bull'
import { AnalysisOrchestrationService, AnalysisJobData } from '@/lib/services/analysis-orchestration.service'

export const processAnalysisJob = async (job: Job<AnalysisJobData>) => {
  console.log(`Starting analysis job ${job.id} for analysis ${job.data.analysisId}`)
  
  try {
    const orchestrationService = new AnalysisOrchestrationService()
    
    // Process the complete analysis pipeline
    await orchestrationService.processAnalysis(job)
    
    console.log(`Analysis job ${job.id} completed successfully`)
    
    return {
      success: true,
      analysisId: job.data.analysisId
    }
  } catch (error) {
    console.error(`Analysis job ${job.id} failed:`, error)
    throw error
  }
}