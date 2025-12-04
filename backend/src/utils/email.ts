import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const emailFrom = process.env.EMAIL_FROM || 'Bisita Iligan <onboarding@resend.dev>';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

export const sendVerificationEmail = async (
  email: string,
  username: string,
  token: string
): Promise<boolean> => {
  const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

  try {
    await resend.emails.send({
      from: emailFrom,
      to: email,
      subject: 'Verify your Bisita Iligan account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🌊 Bisita Iligan</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">City of Majestic Waterfalls</p>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px;">Welcome, ${username}!</h2>
              <p style="color: #64748b; line-height: 1.6; margin: 0 0 24px;">
                Thanks for joining Bisita Iligan! Please verify your email address to unlock all features.
              </p>
              <a href="${verifyUrl}" style="display: block; background: #0284c7; color: white; text-decoration: none; padding: 14px 24px; border-radius: 12px; text-align: center; font-weight: 600; font-size: 16px;">
                Verify Email Address
              </a>
              <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0; text-align: center;">
                This link expires in 24 hours. If you didn't create this account, ignore this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  username: string,
  token: string
): Promise<boolean> => {
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  try {
    await resend.emails.send({
      from: emailFrom,
      to: email,
      subject: 'Reset your Bisita Iligan password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🌊 Bisita Iligan</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Password Reset Request</p>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px;">Hi ${username},</h2>
              <p style="color: #64748b; line-height: 1.6; margin: 0 0 24px;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>
              <a href="${resetUrl}" style="display: block; background: #0284c7; color: white; text-decoration: none; padding: 14px 24px; border-radius: 12px; text-align: center; font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
              <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0; text-align: center;">
                This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
};

export const sendGuideApprovalEmail = async (
  email: string,
  username: string,
  approved: boolean
): Promise<boolean> => {
  try {
    await resend.emails.send({
      from: emailFrom,
      to: email,
      subject: approved
        ? '🎉 Your Bisita Iligan Guide Application is Approved!'
        : 'Update on your Bisita Iligan Guide Application',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <div style="background: linear-gradient(135deg, ${approved ? '#059669' : '#dc2626'} 0%, ${approved ? '#047857' : '#b91c1c'} 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${approved ? '🎉' : '📋'} Guide Application</h1>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px;">Hi ${username},</h2>
              ${
                approved
                  ? `
                <p style="color: #64748b; line-height: 1.6; margin: 0 0 24px;">
                  Congratulations! Your application to become a Bisita Iligan tour guide has been approved. 
                  You can now update your availability and start receiving booking requests from tourists.
                </p>
                <a href="${frontendUrl}/profile" style="display: block; background: #059669; color: white; text-decoration: none; padding: 14px 24px; border-radius: 12px; text-align: center; font-weight: 600; font-size: 16px;">
                  Go to Your Profile
                </a>
              `
                  : `
                <p style="color: #64748b; line-height: 1.6; margin: 0 0 24px;">
                  Thank you for your interest in becoming a Bisita Iligan tour guide. Unfortunately, we couldn't approve your application at this time.
                  Please contact our support team for more details or to reapply.
                </p>
              `
              }
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return true;
  } catch (error) {
    console.error('Failed to send guide approval email:', error);
    return false;
  }
};
