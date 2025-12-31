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
    from: `OSO Official <${from}>`,
    to,
    subject,
    html,
  });

  return info;
}

export const sendMemberOtpEmail = async (email, otp) => {
  const mailOptions = {
    from: `ODISHA SOCIETY OF ONCOLOGY <${SMTP_USER}>`,
    to: email,
    subject: 'Your OTP for OSOO Registration',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">OSOO Member Registration</h2>
        <p>Your OTP for registration is:</p>
        <h1 style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; text-align: center; letter-spacing: 5px;">
          ${otp}
        </h1>
        <p>This OTP is valid for 10 minutes.</p>
        <p>If you didn't request this OTP, please ignore this email.</p>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

export const sendPendingReviewEmail = async (email, name) => {
  const mailOptions = {
    from: `ODISHA SOCIETY OF ONCOLOGY <${SMTP_USER}>`,
    to: email,
    subject: 'OSOO Registration Under Review',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to OSOO, ${name}!</h2>
        <p>Thank you for registering with OSOO. Your registration has been successfully verified with OTP.</p>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
          <h3 style="color: #856404; margin-top: 0;">Your application is now under review</h3>
          <p style="color: #856404; margin-bottom: 0;">
            Our admin team will review your details and documents. This process usually takes 24-48 hours.
          </p>
        </div>
        
        <p>You will receive another email once your application is approved.</p>
        <p>Thank you for your patience!</p>
        <p>Best regards,<br>OSOO Team</p>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

export const sendApprovalEmail = async (email, name, uniqueId, tempPassword) => {
  const mailOptions = {
    from: `ODISHA SOCIETY OF ONCOLOGY <${SMTP_USER}>`,
    to: email,
    subject: 'Welcome to OSOO - Your Account is Approved!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Congratulations, ${name}!</h2>
        <p>Your OSOO membership application has been approved by our admin team.</p>
        
        <div style="background-color: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 5px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #2e7d32; margin-top: 0;">Your Login Credentials:</h3>
          
          <div style="background-color: white; padding: 15px; border-radius: 3px; margin: 10px 0;">
            <p style="margin: 5px 0;"><strong>Unique ID:</strong> <span style="font-family: monospace; font-size: 16px;">${uniqueId}</span></p>
            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <span style="font-family: monospace; font-size: 16px;">${tempPassword}</span></p>
          </div>
          
          <p style="color: #d32f2f; font-weight: bold;">
            ⚠️ Important: Please change your password immediately after first login.
          </p>
        </div>
        
        <p><strong>Login Instructions:</strong></p>
        <ol>
          <li>Go to OSOO member login page</li>
          <li>Enter your Unique ID and Temporary Password</li>
          <li>You'll be prompted to set a new password</li>
        </ol>
        
        <p style="margin-top: 30px;">Welcome aboard! We're excited to have you as part of the OSOO community.</p>
        
        <p>Best regards,<br>OSOO Team</p>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

export const sendRejectionEmail = async (email, name, reason = null) => {
  const mailOptions = {
    from: `ODISHA SOCIETY OF ONCOLOGY <${SMTP_USER}>`,
    to: email,
    subject: 'Update on Your OSOO Registration',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Update on Your OSOO Registration</h2>
        
        <div style="background-color: #ffebee; border: 1px solid #ffcdd2; border-radius: 5px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #c62828; margin-top: 0;">Application Status: Not Approved</h3>
          <p>Dear ${name},</p>
          <p>After reviewing your application, we regret to inform you that we are unable to approve your OSOO membership at this time.</p>
          
          ${reason ? `
            <div style="background-color: white; padding: 15px; border-radius: 3px; margin: 15px 0;">
              <p style="margin: 0;"><strong>Admin Note:</strong> ${reason}</p>
            </div>
          ` : ''}
          
          <p>If you believe this is a mistake or would like more information, please contact our support team.</p>
        </div>
        
        <p>Thank you for your interest in OSOO.</p>
        <p>Best regards,<br>OSOO Team</p>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

export const sendMemberWelcomeEmail = async (email, name, uniqueId, tempPassword) => {
  return sendApprovalEmail(email, name, uniqueId, tempPassword);
};

export const sendPasswordChangeEmail = async (email, name) => {
  const mailOptions = {
    from: `ODISHA SOCIETY OF ONCOLOGY <${SMTP_USER}>`,
    to: email,
    subject: 'Password Changed Successfully - OSOO',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Update Confirmation</h2>
        <p>Hello ${name},</p>
        <p>Your OSOO member account password has been successfully changed.</p>
        <p>If you did not initiate this change, please contact our support team immediately.</p>
        <p>Best regards,<br>OSOO Team</p>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

export default transporter;
