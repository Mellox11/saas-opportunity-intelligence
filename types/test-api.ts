// TypeScript interfaces for test API responses

export interface RedditPost {
  title: string
  score: number
  numComments: number
  author: string
  created: string
  permalink: string
  content?: string
  url?: string
}

export interface FilteredPost {
  title: string
  matchedKeywords: string[]
  score: number
  author?: string
  permalink?: string
}

export interface Opportunity {
  title: string
  opportunityScore: number
  confidenceScore: number
  problemStatement: string
  evidence: string[]
  reasoning: string
  sourcePost: {
    title: string
    score: number
    permalink: string
    subreddit: string
  }
}

export interface PipelineStats {
  redditPosts: number
  filteredPostsCount: number
  aiProcessed: number
  opportunitiesFound: number
}

// RSS Endpoint Response
export interface RSSResponse {
  success: boolean
  message: string
  data: {
    totalPosts: number
    filteredPosts: number
    keywords: string[]
    allPosts: RedditPost[]
    filteredPostsData: FilteredPost[]
    timestamp: string
    source: string
  }
}

// AI Pipeline Endpoint Response
export interface AIResponse {
  success: boolean
  message: string
  data: {
    pipeline: PipelineStats
    sampleRedditPosts: RedditPost[]
    filteredPosts: FilteredPost[]
    opportunities: Opportunity[]
    testInfo: {
      analysisId: string
      timestamp: string
      note: string
    }
  }
}

// Combined response type for the component
export interface TestResponse {
  success: boolean
  message: string
  data: {
    // Statistics
    totalPosts?: number
    filteredPostsCount?: number
    opportunitiesFound?: number
    pipeline?: PipelineStats
    
    // Posts data
    allPosts?: RedditPost[]
    sampleRedditPosts?: RedditPost[]
    filteredPostsData?: FilteredPost[]  // From RSS
    filteredPosts?: FilteredPost[]      // From AI Pipeline
    
    // Analysis data
    opportunities?: Opportunity[]
    sampleOpportunities?: Opportunity[]
    
    // Metadata
    keywords?: string[]
    timestamp?: string
    source?: string
    testInfo?: {
      analysisId: string
      timestamp: string
      note: string
    }
  }
}

// Safe rendering data types (primitives only)
export interface SafePost {
  title: string
  score: string
  numComments: string
  author: string
  created: string
  permalink: string
}

export interface SafeFilteredPost {
  title: string
  matchedKeywords: string
  score: string
  author: string
  permalink: string
}

export interface SafeOpportunity {
  title: string
  opportunityScore: string
  confidenceScore: string
  problemStatement: string
  sourceTitle: string
  sourcePermalink: string
}