import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
}

class EmailService {
  private transporter: nodemailer.Transporter
  
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    })
  }
  
  async sendEmail(options: EmailOptions) {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@saas-opportunity.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
      })
      
      return { success: true, messageId: info.messageId }
    } catch (error) {
      console.error('Email sending failed:', error)
      return { success: false, error }
    }
  }
  
  async sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0ea5e9; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .button { display: inline-block; padding: 12px 24px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Thank you for registering with SaaS Opportunity Intelligence Tool!</p>
              <p>Please click the button below to verify your email address:</p>
              <a href="${verificationUrl}" class="button">Verify Email</a>
              <p style="margin-top: 30px;">Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #0ea5e9;">${verificationUrl}</p>
              <p style="margin-top: 30px;">This link will expire in 24 hours.</p>
            </div>
            <div class="footer">
              <p>If you didn't create an account, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    return this.sendEmail({
      to: email,
      subject: 'Verify your email - SaaS Opportunity Intelligence',
      html
    })
  }
  
  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0ea5e9; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .button { display: inline-block; padding: 12px 24px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reset Your Password</h1>
            </div>
            <div class="content">
              <p>We received a request to reset your password.</p>
              <p>Click the button below to create a new password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p style="margin-top: 30px;">Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #0ea5e9;">${resetUrl}</p>
              <p style="margin-top: 30px;">This link will expire in 1 hour.</p>
            </div>
            <div class="footer">
              <p>If you didn't request a password reset, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    return this.sendEmail({
      to: email,
      subject: 'Reset your password - SaaS Opportunity Intelligence',
      html
    })
  }
}

export const emailService = new EmailService()