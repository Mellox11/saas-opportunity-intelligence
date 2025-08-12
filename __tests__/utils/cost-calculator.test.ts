import {
  calculateRedditRequests,
  calculateCostBreakdown,
  calculateFinalPrice,
  generateCostEstimate,
  isWithinBudget,
  calculateBudgetStatus,
  calculateAccuracy,
  formatCurrency,
  shouldTriggerCircuitBreaker,
  estimateTokenUsage,
  calculateEventCost
} from '@/lib/utils/cost-calculator'
import { AnalysisConfiguration } from '@/lib/validation/analysis-schema'

describe('CostCalculator', () => {
  const sampleConfiguration: AnalysisConfiguration = {
    subreddits: ['entrepreneur', 'startups'],
    timeRange: 30,
    keywords: {
      predefined: ['I hate', 'frustrating'],
      custom: ['need solution']
    }
  }
  
  describe('calculateRedditRequests', () => {
    test('calculates requests for single subreddit and 30 days', () => {
      const requests = calculateRedditRequests(['entrepreneur'], 30)
      expect(requests).toBeGreaterThan(0)
      expect(typeof requests).toBe('number')
    })
    
    test('calculates more requests for multiple subreddits', () => {
      const singleRequests = calculateRedditRequests(['entrepreneur'], 30)
      const multipleRequests = calculateRedditRequests(['entrepreneur', 'startups'], 30)
      expect(multipleRequests).toBeGreaterThan(singleRequests)
    })
    
    test('calculates more requests for longer time ranges', () => {
      const requests30 = calculateRedditRequests(['entrepreneur'], 30)
      const requests60 = calculateRedditRequests(['entrepreneur'], 60)
      const requests90 = calculateRedditRequests(['entrepreneur'], 90)
      
      expect(requests60).toBeGreaterThan(requests30)
      expect(requests90).toBeGreaterThan(requests60)
    })
    
    test('handles unknown subreddits with default activity', () => {
      const requests = calculateRedditRequests(['unknownsubreddit'], 30)
      expect(requests).toBeGreaterThan(0)
    })
  })
  
  describe('calculateCostBreakdown', () => {
    test('returns cost breakdown with reddit and ai costs', () => {
      const breakdown = calculateCostBreakdown(sampleConfiguration)
      
      expect(breakdown).toHaveProperty('reddit')
      expect(breakdown).toHaveProperty('ai')
      expect(breakdown).toHaveProperty('total')
      
      expect(breakdown.reddit).toBeGreaterThan(0)
      expect(breakdown.ai).toBe(1.40) // Fixed AI cost
      expect(breakdown.total).toBeCloseTo(breakdown.reddit + breakdown.ai, 3)
    })
    
    test('reddit cost increases with more subreddits', () => {
      const singleConfig = { ...sampleConfiguration, subreddits: ['entrepreneur'] }
      const multiConfig = { ...sampleConfiguration, subreddits: ['entrepreneur', 'startups'] }
      
      const singleBreakdown = calculateCostBreakdown(singleConfig)
      const multiBreakdown = calculateCostBreakdown(multiConfig)
      
      expect(multiBreakdown.reddit).toBeGreaterThan(singleBreakdown.reddit)
    })
  })
  
  describe('calculateFinalPrice', () => {
    test('applies 4x markup to total cost', () => {
      const breakdown = calculateCostBreakdown(sampleConfiguration)
      const finalPrice = calculateFinalPrice(breakdown)
      
      expect(finalPrice).toBe(parseFloat((breakdown.total * 4).toFixed(2)))
    })
  })
  
  describe('generateCostEstimate', () => {
    test('generates complete cost estimate', () => {
      const estimate = generateCostEstimate(sampleConfiguration)
      
      expect(estimate).toHaveProperty('breakdown')
      expect(estimate).toHaveProperty('finalPrice')
      expect(estimate).toHaveProperty('currency', 'USD')
      expect(estimate).toHaveProperty('accuracy')
      
      expect(estimate.accuracy).toBe(85) // Default accuracy
    })
    
    test('uses provided historical accuracy', () => {
      const estimate = generateCostEstimate(sampleConfiguration, 92)
      expect(estimate.accuracy).toBe(92)
    })
  })
  
  describe('isWithinBudget', () => {
    test('returns true when cost is within budget', () => {
      expect(isWithinBudget(10, 15)).toBe(true)
      expect(isWithinBudget(15, 15)).toBe(true)
    })
    
    test('returns false when cost exceeds budget', () => {
      expect(isWithinBudget(20, 15)).toBe(false)
    })
  })
  
  describe('calculateBudgetStatus', () => {
    test('returns within_budget for costs under 80%', () => {
      expect(calculateBudgetStatus(40, 100)).toBe('within_budget')
      expect(calculateBudgetStatus(79, 100)).toBe('within_budget')
    })
    
    test('returns approaching_limit for costs 80-99%', () => {
      expect(calculateBudgetStatus(80, 100)).toBe('approaching_limit')
      expect(calculateBudgetStatus(99, 100)).toBe('approaching_limit')
    })
    
    test('returns exceeded for costs at or above 100%', () => {
      expect(calculateBudgetStatus(100, 100)).toBe('exceeded')
      expect(calculateBudgetStatus(110, 100)).toBe('exceeded')
    })
  })
  
  describe('calculateAccuracy', () => {
    test('returns 100% for exact match', () => {
      expect(calculateAccuracy(10, 10)).toBe(100)
    })
    
    test('calculates accuracy based on percentage difference', () => {
      expect(calculateAccuracy(10, 8)).toBe(75) // 25% difference
      expect(calculateAccuracy(10, 12)).toBe(83.33) // ~16.67% difference
    })
    
    test('handles zero actual cost', () => {
      expect(calculateAccuracy(10, 0)).toBe(100)
    })
    
    test('clamps accuracy to 0-100 range', () => {
      // 1 estimated vs 10 actual = 9 difference / 10 actual = 90% difference
      // 100 - 90 = 10% accuracy
      expect(calculateAccuracy(1, 10)).toBe(10)
      
      // Very large difference should be close to 0
      expect(calculateAccuracy(1, 1000)).toBe(0.1)
    })
  })
  
  describe('formatCurrency', () => {
    test('formats positive amounts correctly', () => {
      expect(formatCurrency(10.99)).toBe('$10.99')
      expect(formatCurrency(0)).toBe('$0.00')
      expect(formatCurrency(1000)).toBe('$1,000.00')
    })
    
    test('handles decimal precision', () => {
      expect(formatCurrency(10.1)).toBe('$10.10')
      expect(formatCurrency(10.999)).toBe('$11.00')
    })
  })
  
  describe('shouldTriggerCircuitBreaker', () => {
    test('triggers at 95% by default', () => {
      expect(shouldTriggerCircuitBreaker(95, 100)).toBe(true)
      expect(shouldTriggerCircuitBreaker(94.9, 100)).toBe(false)
    })
    
    test('uses custom threshold', () => {
      expect(shouldTriggerCircuitBreaker(90, 100, 0.9)).toBe(true)
      expect(shouldTriggerCircuitBreaker(89, 100, 0.9)).toBe(false)
    })
  })
  
  describe('estimateTokenUsage', () => {
    test('estimates tokens based on post count and length', () => {
      const tokens = estimateTokenUsage(100, 500)
      expect(tokens).toBeGreaterThan(0)
      expect(typeof tokens).toBe('number')
    })
    
    test('more posts result in more tokens', () => {
      const tokens100 = estimateTokenUsage(100, 500)
      const tokens200 = estimateTokenUsage(200, 500)
      expect(tokens200).toBeGreaterThan(tokens100)
    })
  })
  
  describe('calculateEventCost', () => {
    test('calculates reddit api request cost', () => {
      const cost = calculateEventCost('reddit_api_request', 100)
      expect(cost).toBe(0.012) // 100 * 0.00012
    })
    
    test('calculates openai tokens cost', () => {
      const cost = calculateEventCost('openai_tokens', 1000)
      expect(cost).toBe(0.045) // (1000/1000) * 0.045
    })
    
    test('calculates pinecone query cost', () => {
      const cost = calculateEventCost('pinecone_query', 100)
      expect(cost).toBe(0.01) // 100 * 0.0001
    })
    
    test('calculates pinecone upsert cost', () => {
      const cost = calculateEventCost('pinecone_upsert', 1000)
      expect(cost).toBe(0.01) // (1000/1000) * 0.01
    })
    
    test('returns 0 for unknown event types', () => {
      // @ts-ignore - testing invalid event type
      const cost = calculateEventCost('unknown_type', 100)
      expect(cost).toBe(0)
    })
  })
})