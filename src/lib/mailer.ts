import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const DEFAULT_FROM = `"OPAL-AI Support" <${process.env.GMAIL_USER}>`;

export async function sendPasswordResetEmail(toEmail: string, resetLink: string) {
    await transporter.sendMail({
      from: DEFAULT_FROM,
      to: toEmail,
      subject: "Reset Your OPAL-AI Password",
      html: getTemplate("Reset Your Password", `
        <p style="color: #9ca3af; line-height: 1.6;">
          We received a request to reset your password. 
          Click the button below to create a new password.
          This link expires in 1 hour.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" style="background: #DC2626; color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(220, 38, 38, 0.39);">
            Reset Password
          </a>
        </div>
      `, "If you did not request this, ignore this email.")
    });
}

export async function sendDonorWelcomeEmail(toEmail: string, name: string, bloodType: string) {
    await transporter.sendMail({
      from: DEFAULT_FROM,
      to: toEmail,
      subject: "Welcome to the Circle of Life-Savers | OPAL-AI",
      html: getTemplate("Welcome, Hero!", `
        <div style="background: rgba(220, 38, 38, 0.1); border-left: 4px solid #DC2626; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
            <p style="color: #ffffff; margin: 0; font-weight: 700; font-size: 18px;">Thank you for joining, ${name}!</p>
            <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px;">Your registration as a life-saver is successful.</p>
        </div>
        
        <table width="100%" style="border-collapse: collapse; margin-bottom: 24px;">
            <tr>
                <td style="padding: 15px; background: #171717; border-radius: 12px; border: 1px solid #262626;">
                    <p style="color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 5px;">Your Blood Type</p>
                    <p style="color: #DC2626; font-size: 24px; font-weight: 900; margin: 0;">${bloodType}</p>
                </td>
            </tr>
        </table>

        <p style="color: #9ca3af; line-height: 1.6; font-size: 15px;">
            Your profile is now active on the OPAL-AI matching network. In case of an emergency matching your profile in your city, you will receive an instant notification.
        </p>
      `, "You are now part of a network destined to save lives.")
    });
}

export async function sendDonorSuspensionEmail(toEmail: string, name: string, reason: string) {
    await transporter.sendMail({
      from: DEFAULT_FROM,
      to: toEmail,
      subject: "Urgent: Account Status Update | OPAL-AI",
      html: getTemplate("Account Suspended", `
        <p style="color: #ffffff; font-size: 16px; margin-bottom: 20px;">Dear ${name},</p>
        <p style="color: #9ca3af; line-height: 1.6; margin-bottom: 24px;">
            Your donor profile has been temporarily suspended by our medical administration team.
        </p>
        
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); padding: 24px; border-radius: 16px; margin-bottom: 24px;">
            <p style="color: #ef4444; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Reason for Suspension</p>
            <p style="color: #ffffff; font-size: 15px; font-style: italic; margin: 0;">&quot;${reason}&quot;</p>
        </div>

        <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
            While suspended, you will not be matched with emergency requests. If you believe this is a mistake or have updated your records, please contact our support desk.
        </p>
      `, "Protocol Verification in Progress")
    });
}

export async function sendDonorReActivationEmail(toEmail: string, name: string) {
    await transporter.sendMail({
      from: DEFAULT_FROM,
      to: toEmail,
      subject: "Account Re-Activated! | OPAL-AI",
      html: getTemplate("Welcome Back", `
        <p style="color: #ffffff; font-size: 16px; margin-bottom: 20px;">Great news, ${name}!</p>
        <p style="color: #9ca3af; line-height: 1.6; margin-bottom: 24px;">
            Your donor profile has been successfully re-activated. You are once again visible in our life-saving matching network.
        </p>
        
        <div style="text-align: center; padding: 30px; background: rgba(34, 197, 94, 0.05); border-radius: 20px; border: 1px dashed rgba(34, 197, 94, 0.2);">
            <p style="color: #22c55e; font-weight: 800; font-size: 20px; margin: 0;">Status: FULLY ACTIVE</p>
        </div>
      `, "Thank you for your patience and your commitment to saving lives.")
    });
}

export async function sendHospitalRegistrationEmail(toEmail: string, hospitalName: string, license: string) {
    await transporter.sendMail({
      from: DEFAULT_FROM,
      to: toEmail,
      subject: "Institutional Application Received | OPAL-AI",
      html: getTemplate("Application Pending", `
        <p style="color: #9ca3af; line-height: 1.6;">
            Your application to join the OPAL-AI Medical Network as <strong style="color: #ffffff;">${hospitalName}</strong> has been received and is currently under review by our administration team.
        </p>
        
        <div style="background: #171717; padding: 20px; border-radius: 16px; border: 1px solid #262626; margin: 24px 0;">
            <div style="margin-bottom: 12px;">
                <span style="color: #6b7280; font-size: 10px; text-transform: uppercase; display: block; margin-bottom: 4px;">License Number</span>
                <span style="color: #ffffff; font-weight: 600;">${license}</span>
            </div>
            <div>
                <span style="color: #6b7280; font-size: 10px; text-transform: uppercase; display: block; margin-bottom: 4px;">Review Status</span>
                <span style="color: #eab308; font-weight: 600; display: flex; items-center;">PENDING VERIFICATION</span>
            </div>
        </div>
      `, "OPAL-AI — Partnering for Medical Excellence")
    });
}

export async function sendHospitalWelcomeEmail(toEmail: string, hospitalName: string) {
    await transporter.sendMail({
      from: DEFAULT_FROM,
      to: toEmail,
      subject: "Welcome to the OPAL-AI Clinical Network!",
      html: getTemplate("Credentials Verified ✅", `
        <p style="color: #ffffff; font-size: 16px; margin-bottom: 20px;">Dear Administrator at ${hospitalName},</p>
        <p style="color: #9ca3af; line-height: 1.6; margin-bottom: 24px;">
            We are pleased to inform you that your institutional credentials have been verified. Your hospital is now an authorized partner in our national life-saving network.
        </p>
        
        <div style="background: rgba(34, 197, 94, 0.05); border: 1px solid rgba(34, 197, 94, 0.2); padding: 24px; border-radius: 16px; margin-bottom: 24px; text-align: center;">
            <p style="color: #22c55e; font-weight: 900; font-size: 18px; margin: 0; text-transform: uppercase; letter-spacing: 0.1em;">Institutional Access Activated</p>
        </div>

        <p style="color: #9ca3af; line-height: 1.6;">
            You can now log in to the hospital dashboard to access high-precision AI matching, view donor maps, and initiate procurement requests.
        </p>
      `, "Clinical Partnership Established")
    });
}

export async function sendHospitalRejectionEmail(toEmail: string, hospitalName: string, reason: string) {
    await transporter.sendMail({
      from: DEFAULT_FROM,
      to: toEmail,
      subject: "Application Status Update | OPAL-AI Clinical Network",
      html: getTemplate("Application Update", `
        <p style="color: #ffffff; font-size: 16px; margin-bottom: 20px;">Regarding your application for ${hospitalName},</p>
        <p style="color: #9ca3af; line-height: 1.6; margin-bottom: 24px;">
            Thank you for your interest in joining the OPAL-AI network. After reviewing the documentation provided, we are unable to approve your institutional access at this time.
        </p>
        
        <div style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.1); padding: 24px; border-radius: 16px; margin-bottom: 24px;">
            <p style="color: #ef4444; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Decline Reason</p>
            <p style="color: #ffffff; font-size: 14px; font-style: italic; margin: 0;">&quot;${reason}&quot;</p>
        </div>

        <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
            If you wish to appeal this decision or have corrected registration documents, please reply to this email or re-register with updated credentials.
        </p>
      `, "Administrative Protocol Review Complete")
    });
}

function getTemplate(title: string, content: string, footer: string) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        </style>
    </head>
    <body style="background-color: #050505; padding: 40px 20px; font-family: 'Inter', sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #171717; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
            <div style="background: linear-gradient(145deg, #171717, #0a0a0a); padding: 40px; text-align: center; border-bottom: 1px solid #171717;">
                <div style="height: 48px; width: 48px; background-color: #DC2626; border-radius: 12px; display: inline-block; margin-bottom: 16px;">
                    <img src="https://img.icons8.com/ios-filled/50/ffffff/heart-with-pulse.png" style="width: 28px; padding-top: 10px;" />
                </div>
                <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 0; letter-spacing: -0.02em;">
                    OPAL<span style="color: #DC2626;">-AI</span>
                </h1>
            </div>
            
            <div style="padding: 40px;">
                <h2 style="color: #ffffff; font-size: 28px; font-weight: 800; margin-top: 0; margin-bottom: 24px; letter-spacing: -0.01em;">${title}</h2>
                ${content}
            </div>

            <div style="background-color: #080808; padding: 30px 40px; text-align: center; border-top: 1px solid #171717;">
                <p style="color: #4b5563; font-size: 13px; font-weight: 500; margin: 0;">${footer}</p>
                <div style="margin-top: 20px; font-size: 11px; color: #374151;">
                    &copy; 2026 OPAL-AI Platform. Dedicated to preserving the gift of life.
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

export async function sendEmail({ to, subject, html }: { to: string | string[]; subject: string; html: string; }) {
  await transporter.sendMail({
    from: DEFAULT_FROM,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html,
  });
}
