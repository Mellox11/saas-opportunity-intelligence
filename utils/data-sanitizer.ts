// Data sanitization utilities for safe React rendering

import { 
  TestResponse, 
  RedditPost, 
  FilteredPost, 
  Opportunity,
  SafePost,
  SafeFilteredPost,
  SafeOpportunity
} from '../types/test-api'

/**
 * Safely convert any value to a string for React rendering
 */
export function safeString(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number') {
    return value.toString()
  }
  if (typeof value === 'boolean') {
    return value.toString()
  }
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

/**
 * Safely convert any value to a number string for display
 */
export function safeNumber(value: any): string {
  const num = Number(value)
  return isNaN(num) ? '0' : num.toString()
}

/**
 * Safely convert array to comma-separated string
 */
export function safeArray(value: any): string {
  if (!Array.isArray(value)) {
    return ''
  }
  return value.filter(item => item !== null && item !== undefined)
              .map(item => safeString(item))
              .join(', ')
}

/**
 * Convert RedditPost to SafePost for rendering
 */
export function sanitizePost(post: any): SafePost {
  return {
    title: safeString(post?.title || 'No title'),
    score: safeNumber(post?.score || 0),
    numComments: safeNumber(post?.numComments || 0),
    author: safeString(post?.author || 'Unknown'),
    created: safeString(post?.created || 'Unknown'),
    permalink: safeString(post?.permalink || '#')
  }
}

/**
 * Convert FilteredPost to SafeFilteredPost for rendering
 */
export function sanitizeFilteredPost(post: any): SafeFilteredPost {
  return {
    title: safeString(post?.title || 'No title'),
    matchedKeywords: safeArray(post?.matchedKeywords || []),
    score: safeNumber(post?.score || 0),
    author: safeString(post?.author || 'Unknown'),
    permalink: safeString(post?.permalink || '#')
  }
}

/**
 * Convert Opportunity to SafeOpportunity for rendering  
 */
export function sanitizeOpportunity(opp: any): SafeOpportunity {
  return {
    title: safeString(opp?.title || 'No title'),
    opportunityScore: safeNumber(opp?.opportunityScore || 0),
    confidenceScore: safeNumber(Math.round((opp?.confidenceScore || 0) * 100)),
    problemStatement: safeString(opp?.problemStatement || 'No description available'),
    sourceTitle: safeString(opp?.sourcePost?.title || 'No source'),
    sourcePermalink: safeString(opp?.sourcePost?.permalink || '#')
  }
}

/**
 * Validate and sanitize the entire API response
 */
export function sanitizeApiResponse(response: any): TestResponse | null {
  if (!response || typeof response !== 'object') {
    return null
  }

  if (!response.success) {
    return {
      success: false,
      message: safeString(response.message || 'Unknown error'),
      data: {}
    }
  }

  const data = response.data || {}
  
  return {
    success: true,
    message: safeString(response.message || 'Success'),
    data: {
      // Statistics (safe numbers)
      totalPosts: Number(data.totalPosts || 0),
      filteredPosts: Number(data.filteredPosts || 0),
      opportunitiesFound: Number(data.opportunitiesFound || data.pipeline?.opportunitiesFound || 0),
      
      // Pipeline stats
      pipeline: data.pipeline ? {
        redditPosts: Number(data.pipeline.redditPosts || 0),
        filteredPosts: Number(data.pipeline.filteredPosts || 0),
        aiProcessed: Number(data.pipeline.aiProcessed || 0),
        opportunitiesFound: Number(data.pipeline.opportunitiesFound || 0)
      } : undefined,
      
      // Posts arrays (validated)
      allPosts: Array.isArray(data.allPosts) ? data.allPosts : undefined,
      sampleRedditPosts: Array.isArray(data.sampleRedditPosts) ? data.sampleRedditPosts : undefined,
      filteredPostsData: Array.isArray(data.filteredPostsData) ? data.filteredPostsData : undefined,
      filteredPosts: Array.isArray(data.filteredPosts) ? data.filteredPosts : undefined,
      
      // Opportunities (validated)
      opportunities: Array.isArray(data.opportunities) ? data.opportunities : undefined,
      sampleOpportunities: Array.isArray(data.sampleOpportunities) ? data.sampleOpportunities : undefined,
      
      // Metadata
      keywords: Array.isArray(data.keywords) ? data.keywords : undefined,
      timestamp: safeString(data.timestamp || ''),
      source: safeString(data.source || ''),
      testInfo: data.testInfo ? {
        analysisId: safeString(data.testInfo.analysisId || ''),
        timestamp: safeString(data.testInfo.timestamp || ''),
        note: safeString(data.testInfo.note || '')
      } : undefined
    }
  }
}

/**
 * Safe array processing with fallbacks
 */
export function safeArrayMap<T, R>(
  array: T[] | undefined | null, 
  mapFn: (item: T, index: number) => R
): R[] {
  if (!Array.isArray(array)) {
    return []
  }
  
  try {
    return array.map(mapFn)
  } catch (error) {
    console.warn('Error in safeArrayMap:', error)
    return []
  }
}

/**
 * Get safe posts array from response data
 */
export function getSafePosts(data: any): SafePost[] {
  const posts = data?.allPosts || data?.sampleRedditPosts || []
  return safeArrayMap(posts, sanitizePost)
}

/**
 * Get safe filtered posts array from response data
 */
export function getSafeFilteredPosts(data: any): SafeFilteredPost[] {
  const posts = data?.filteredPostsData || data?.filteredPosts || []
  return safeArrayMap(posts, sanitizeFilteredPost)
}

/**
 * Get safe opportunities array from response data
 */
export function getSafeOpportunities(data: any): SafeOpportunity[] {
  const opportunities = data?.opportunities || data?.sampleOpportunities || []
  return safeArrayMap(opportunities, sanitizeOpportunity)
}