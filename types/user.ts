import { z } from 'zod'

/**
 * User profile schema for type-safe JSON parsing
 */
export const UserProfileSchema = z.object({
  name: z.string().optional(),
  company: z.string().optional(),
  avatar: z.string().url().optional(),
  bio: z.string().optional(),
}).nullable()

/**
 * User preferences schema
 */
export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  notifications: z.object({
    email: z.boolean().default(true),
    browser: z.boolean().default(true),
    analysis: z.boolean().default(true),
  }).default({}),
  dashboard: z.object({
    defaultView: z.enum(['grid', 'list']).default('grid'),
    itemsPerPage: z.number().min(10).max(100).default(20),
  }).default({}),
}).nullable()

/**
 * Type definitions
 */
export type UserProfile = z.infer<typeof UserProfileSchema>
export type UserPreferences = z.infer<typeof UserPreferencesSchema>

/**
 * Enhanced user type with parsed profile and preferences
 */
export interface UserWithProfile {
  id: string
  email: string
  emailVerified: boolean
  profile: UserProfile
  preferences: UserPreferences
  createdAt: Date
  updatedAt: Date
}

/**
 * NextAuth user type extension
 */
export interface NextAuthUser {
  id: string
  email: string
  name: string
}