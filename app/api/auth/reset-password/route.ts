import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AuthService } from '@/lib/auth/jwt'
import { resetPasswordSchema } from '@/lib/validation/auth-schema'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = resetPasswordSchema.parse(body)
    
    // Find reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: validatedData.token },
      include: { user: true }
    })
    
    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }
    
    if (resetToken.expires < new Date()) {
      // Token expired
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id }
      })
      
      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      )
    }
    
    // Hash new password
    const passwordHash = await AuthService.hashPassword(validatedData.password)
    
    // Update user password
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash }
    })
    
    // Delete the used token
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id }
    })
    
    // Delete all sessions for this user (force re-login)
    await prisma.session.deleteMany({
      where: { userId: resetToken.userId }
    })
    
    return NextResponse.json(
      { message: 'Password reset successful. Please log in with your new password.' },
      { status: 200 }
    )
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    )
  }
}