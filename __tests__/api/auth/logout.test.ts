/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/auth/logout/route'
import { LogoutService } from '@/lib/auth/logout.service'
import { prisma } from '@/lib/db'

// Polyfill Request for Jest environment
if (typeof Request === 'undefined') {
  global.Request = class MockRequest {
    constructor(public url: string, public init?: any) {}
  } as any
}

// Mock the dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    session: {
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('@/lib/observability/logger', () => ({
  AppLogger: {
    auth: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should logout successfully with valid session token', async () => {
    // Mock database responses
    const mockSession = {
      userId: 'user123',
      sessionToken: 'valid-session-token',
    }
    
    ;(prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.session.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })

    // Create request with session cookie
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        'cookie': 'session-token=valid-session-token',
        'content-type': 'application/json',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Logged out successfully')
    
    // Check that cookies are cleared
    const cookies = response.headers.getSetCookie()
    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining('session-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT'),
        expect.stringContaining('auth-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT'),
      ])
    )
  })

  it('should handle logout without session token', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Logged out successfully')
    
    // Should still clear cookies even without session
    const cookies = response.headers.getSetCookie()
    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining('session-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT'),
        expect.stringContaining('auth-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT'),
      ])
    )
  })

  it('should handle database errors gracefully', async () => {
    // Mock database error during session deletion
    ;(prisma.session.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user123',
      sessionToken: 'valid-session-token',
    })
    ;(prisma.session.deleteMany as jest.Mock).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        'cookie': 'session-token=valid-session-token',
        'content-type': 'application/json',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200) // Still returns 200 and clears cookies
    expect(data.message).toBe('Logout completed with warnings')
    
    // Should still clear cookies even on database error
    const cookies = response.headers.getSetCookie()
    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining('session-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT'),
        expect.stringContaining('auth-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT'),
      ])
    )
  })
})

describe('LogoutService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should delete sessions successfully', async () => {
    ;(prisma.session.deleteMany as jest.Mock).mockResolvedValue({ count: 2 })

    const result = await LogoutService.logout({
      sessionToken: 'test-token',
      userId: 'user123',
      clearAllUserSessions: true,
    })

    expect(result.success).toBe(true)
    expect(result.sessionsCleared).toBe(4) // 2 + 2 (token + all user sessions)
    expect(prisma.session.deleteMany).toHaveBeenCalledTimes(2)
  })

  it('should handle logout errors', async () => {
    ;(prisma.session.deleteMany as jest.Mock).mockRejectedValue(new Error('Database error'))

    const result = await LogoutService.logout({
      sessionToken: 'test-token',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Database error')
    expect(result.sessionsCleared).toBe(0)
  })

  it('should create logout response with proper headers', () => {
    const response = LogoutService.createLogoutResponse('Test message', 200)
    const cookies = response.headers.getSetCookie()

    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining('session-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT'),
        expect.stringContaining('auth-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT'),
      ])
    )
  })
})