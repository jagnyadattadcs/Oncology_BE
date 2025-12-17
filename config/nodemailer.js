import nodemailer from 'nodemailer';
import dotenv from "dotenv";
dotenv.config();

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE, // 'true' or 'false' in env
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM, // optional, fallback to SMTP_USER
} = process.env;

// create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT ? Number(SMTP_PORT) : 587,
  secure: SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export async function sendOtpEmail(to, otp) {
  const from = SMTP_FROM || SMTP_USER;
  const subject = "Your Admin Login OTP";
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height:1.4; color:#111">
      <h3 style="margin-bottom:0.25rem">Your OTP for Admin Login</h3>
      <p style="margin-top:0; margin-bottom:1rem">Use the following One Time Password to complete admin login. It will expire in 5 minutes.</p>
      <div style="font-size:22px; font-weight:700; letter-spacing:2px; background:#f5f5f5; display:inline-block; padding:10px 14px; border-radius:6px;">
        ${otp}
      </div>
      <p style="margin-top:1rem; color:#666; font-size:13px">If you did not request this, ignore this email.</p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `ODISHA SOCIETY OF ONCOLOGY <${from}>`,
    to,
    subject,
    html,
  });

  return info;
}

// Send welcome email to new member
export const sendMemberWelcomeEmail = async (email, name, uniqueId, tempPassword) => {
  try {
    const mailOptions = {
      from: `"OSOO Association" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to OSOO Association - Your Registration is Complete!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #0b61a8; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                .credentials { background-color: #e8f4ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .highlight { color: #0b61a8; font-weight: bold; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to OSOO Association!</h1>
                </div>
                <div class="content">
                    <p>Dear <strong>${name}</strong>,</p>
                    
                    <p>Congratulations! Your registration with the <strong>Odisha Surgical Oncology Association (OSOO)</strong> has been successfully verified.</p>
                    
                    <p>You are now a registered member of our association. Here are your login credentials:</p>
                    
                    <div class="credentials">
                        <p><strong>Your Member ID:</strong> <span class="highlight">${uniqueId}</span></p>
                        <p><strong>Temporary Password:</strong> <span class="highlight">${tempPassword}</span></p>
                    </div>
                    
                    <p><strong>Important Instructions:</strong></p>
                    <ol>
                        <li>Use the above credentials to log in to the member portal</li>
                        <li>You will be prompted to change your temporary password on first login</li>
                        <li>Keep your member ID safe for future reference</li>
                    </ol>
                    
                    <p><strong>Next Steps:</strong></p>
                    <ul>
                        <li>Complete your profile</li>
                        <li>Pay your membership fees (if not already done)</li>
                        <li>Explore member benefits and resources</li>
                    </ul>
                    
                    <p>For any assistance, please contact our support team.</p>
                    
                    <p>Best regards,<br>
                    <strong>OSOO Association Team</strong></p>
                </div>
                <div class="footer">
                    <p>This is an automated email. Please do not reply to this message.</p>
                    <p>© ${new Date().getFullYear()} OSOO Association. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

// Send password change confirmation email
export const sendPasswordChangeEmail = async (email, name) => {
  try {
    const mailOptions = {
      from: `"OSOO Association" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Changed Successfully - OSOO Association',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Changed Successfully</h1>
                </div>
                <div class="content">
                    <p>Dear <strong>${name}</strong>,</p>
                    
                    <p>Your password for the OSOO Association member portal has been successfully changed.</p>
                    
                    <p><strong>Security Note:</strong></p>
                    <ul>
                        <li>If you did not make this change, please contact support immediately</li>
                        <li>Never share your password with anyone</li>
                        <li>Use a strong, unique password for your account</li>
                    </ul>
                    
                    <p>If you have any questions or concerns, please don't hesitate to contact our support team.</p>
                    
                    <p>Best regards,<br>
                    <strong>OSOO Association Team</strong></p>
                </div>
                <div class="footer">
                    <p>This is an automated security notification. Please do not reply to this message.</p>
                    <p>© ${new Date().getFullYear()} OSOO Association. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password change email sent to ${email}`);
  } catch (error) {
    console.error('Error sending password change email:', error);
    throw error;
  }
};
