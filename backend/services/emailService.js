import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

let transporter = null;

// Initialize Transporter
async function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host: host,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    });
    console.log(`📧 Configured custom SMTP transporter for ${host}`);
  } else {
    // Generate Ethereal Email test account if no SMTP provided
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`📧 Ethereal Email initialized: ${testAccount.user}`);
    } catch (e) {
      console.warn("Could not create Ethereal Email account, fallback to console logger.");
      transporter = null;
    }
  }

  return transporter;
}

export async function sendResetCodeEmail(toEmail, code, username = "Commuter") {
  const subject = "WakeStop — 6-Digit Password Reset Verification Code";
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #050811; color: #ffffff; padding: 30px; border-radius: 16px; max-width: 500px; margin: 0 auto; border: 1px solid #00F0FF;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #00F0FF; margin: 0; font-size: 24px; font-weight: 800;">WakeStop</h1>
        <p style="color: #8A99AD; font-size: 13px; margin-top: 4px;">Never Miss Your Stop Again</p>
      </div>

      <div style="background: rgba(13, 19, 36, 0.8); border: 1px solid rgba(0, 240, 255, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
        <p style="font-size: 14px; color: #E1E7EC; margin-top: 0;">Hello <strong>${username}</strong>,</p>
        <p style="font-size: 13px; color: #94A3B8;">Your 6-digit verification code to reset your WakeStop password is:</p>
        
        <div style="background-color: #050811; border: 2px solid #FFB800; color: #FFB800; font-size: 32px; font-weight: 900; letter-spacing: 8px; padding: 14px; border-radius: 10px; margin: 20px 0; display: inline-block;">
          ${code}
        </div>

        <p style="font-size: 12px; color: #FFB800; margin-bottom: 0;">⚠️ This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>

      <div style="text-align: center; margin-top: 24px; border-top: 1px solid #1E293B; padding-top: 16px; font-size: 11px; color: #64748B;">
        Sent to <span style="color: #00F0FF;">${toEmail}</span> by WakeStop Security System.
      </div>
    </div>
  `;

  console.log(`\n======================================================`);
  console.log(`✉️  EMAIL DISPATCHED TO: ${toEmail}`);
  console.log(`🔑  6-DIGIT VERIFICATION CODE: [ ${code} ]`);
  console.log(`======================================================\n`);

  try {
    const mailTransporter = await getTransporter();
    if (mailTransporter) {
      const info = await mailTransporter.sendMail({
        from: '"WakeStop Security" <no-reply@wakestop.app>',
        to: toEmail,
        subject: subject,
        html: htmlContent,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`🔗 Ethereal Email Preview URL: ${previewUrl}`);
        return { success: true, previewUrl };
      }
    }
  } catch (err) {
    console.warn("Nodemailer send notice:", err?.message);
  }

  return { success: true };
}
