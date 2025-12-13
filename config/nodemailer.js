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