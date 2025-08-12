import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { configurationSchema } from '@/lib/validation/analysis-schema'
import { withAuth } from '@/lib/auth/auth-guard'
import { ApiErrorHandler } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

async function handleGET(request: NextRequest) {
  try {
    const user = (request as any).user

    // Get user's saved configurations from preferences
    const userPreferences = await prisma.user.findUnique({
      where: { id: user.id },
      select: { preferences: true }
    })

    const preferences = JSON.parse(userPreferences?.preferences || '{}')
    const savedConfigurations = preferences.analysisConfigurations || []

    return ApiErrorHandler.success({
      configurations: savedConfigurations
    })
  } catch (error) {
    return ApiErrorHandler.handleError(error, 'Get configurations')
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const user = (request as any).user
    const body = await request.json()
    
    // Validate the configuration
    const validatedConfig = configurationSchema.parse(body)
    
    // Get current user preferences
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { preferences: true }
    })

    const preferences = JSON.parse(currentUser?.preferences || '{}')
    const savedConfigurations = preferences.analysisConfigurations || []
    
    // If configuration has a name, save it to preferences
    if (validatedConfig.name) {
      const existingIndex = savedConfigurations.findIndex(
        (config: any) => config.name === validatedConfig.name
      )
      
      if (existingIndex >= 0) {
        savedConfigurations[existingIndex] = validatedConfig
      } else {
        savedConfigurations.push(validatedConfig)
      }
      
      // Update user preferences
      await prisma.user.update({
        where: { id: user.id },
        data: {
          preferences: JSON.stringify({
            ...preferences,
            analysisConfigurations: savedConfigurations
          })
        }
      })
    }
    
    // Create a new analysis record with the configuration
    const analysis = await prisma.analysis.create({
      data: {
        userId: user.id,
        status: 'pending',
        configuration: JSON.stringify(validatedConfig),
        progress: JSON.stringify({}),
        metadata: JSON.stringify({
          configurationSaved: !!validatedConfig.name,
          createdFrom: 'configuration-page'
        })
      }
    })

    return ApiErrorHandler.success({
      message: 'Configuration saved successfully',
      analysisId: analysis.id,
      configuration: validatedConfig
    }, 201)
  } catch (error) {
    return ApiErrorHandler.handleError(error, 'Save configuration')
  }
}

export async function GET(request: NextRequest) {
  return withAuth(handleGET)(request)
}

export async function POST(request: NextRequest) {
  return withAuth(handlePOST)(request)
}