import { z } from 'zod'

/**
 * Safe JSON parsing utilities with schema validation
 * Prevents crashes from malformed JSON data
 */
export class SafeParser {
  /**
   * Safely parse JSON with Zod schema validation
   * @param data - JSON string to parse
   * @param schema - Zod schema for validation
   * @returns Parsed and validated object or null if parsing fails
   */
  static parseJSON<T>(data: string, schema: z.ZodSchema<T>): T | null {
    try {
      // First attempt JSON parsing
      const parsed = JSON.parse(data)
      
      // Then validate against schema
      const validated = schema.parse(parsed)
      
      return validated
    } catch (error) {
      console.error('JSON parsing failed:', {
        data: data.substring(0, 100) + (data.length > 100 ? '...' : ''),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Parse JSON with fallback value
   * @param data - JSON string to parse
   * @param schema - Zod schema for validation
   * @param fallback - Fallback value if parsing fails
   * @returns Parsed object or fallback value
   */
  static parseJSONWithFallback<T>(
    data: string, 
    schema: z.ZodSchema<T>, 
    fallback: T
  ): T {
    const result = this.parseJSON(data, schema)
    return result !== null ? result : fallback
  }

  /**
   * Parse JSON with custom error handler
   * @param data - JSON string to parse
   * @param schema - Zod schema for validation
   * @param onError - Custom error handler function
   * @returns Parsed object or null
   */
  static parseJSONWithHandler<T>(
    data: string,
    schema: z.ZodSchema<T>,
    onError: (error: Error, data: string) => void
  ): T | null {
    try {
      const parsed = JSON.parse(data)
      return schema.parse(parsed)
    } catch (error) {
      onError(error as Error, data)
      return null
    }
  }
}

// Common schemas for reuse
export const CommonSchemas = {
  /**
   * Analysis progress schema
   */
  AnalysisProgress: z.object({
    stage: z.enum(['initializing', 'reddit_collection', 'ai_processing', 'report_generation', 'completed', 'failed']),
    message: z.string(),
    percentage: z.number().min(0).max(100),
    totalPosts: z.number().optional(),
    processedPosts: z.number().optional(),
    opportunitiesFound: z.number().optional(),
    estimatedCompletion: z.date().optional(),
    error: z.string().optional()
  }),

  /**
   * Generic configuration schema
   */
  Configuration: z.record(z.unknown()),

  /**
   * Metadata schema
   */
  Metadata: z.record(z.unknown()).nullable()
}