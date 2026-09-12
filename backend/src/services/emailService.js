const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;
  const service = process.env.SMTP_SERVICE || ((host && host.toLowerCase().includes("gmail")) ? "gmail" : null);

  if ((service || host) && user && pass) {
    const config = service
      ? {
          service,
          auth: { user, pass },
          connectionTimeout: 6000,
          greetingTimeout: 5000,
          socketTimeout: 8000,
        }
      : {
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
          connectionTimeout: 6000,
          greetingTimeout: 5000,
          socketTimeout: 8000,
          tls: {
            rejectUnauthorized: false,
          },
        };

    transporter = nodemailer.createTransport(config);
  }

  return transporter;
}

/**
 * Send an email reporting a misbehaving group member
 * @param {Object} params
 * @param {string} params.groupName
 * @param {string} params.reporterUsername
 * @param {string} params.reportedUsername
 * @param {string} params.reason
 * @param {string} [params.details]
 */
async function sendReportEmail({ groupName, reporterUsername, reportedUsername, reason, details }) {
  const adminEmail = process.env.REPORT_ADMIN_EMAIL || "walvesoutis@gmail.com";
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;

  // Ensure fromEmail is a valid RFC 2822 email format.
  // If SMTP_FROM is malformed (e.g. '"Cybershare" cybershare.website' without @) or using Gmail,
  // ensure it uses the authenticated smtpUser so Gmail doesn't reject or hang.
  let fromEmail = process.env.SMTP_FROM;
  if (!fromEmail || !fromEmail.includes("@")) {
    if (smtpUser && smtpUser.includes("@")) {
      fromEmail = `"Cybershare Community" <${smtpUser}>`;
    } else {
      fromEmail = '"Cybershare Community" <no-reply@cybershare.app>';
    }
  } else if (smtpUser && smtpUser.includes("@") && (!fromEmail.includes("<") || !fromEmail.includes(">"))) {
    // If user provided just an email or raw string, wrap nicely
    fromEmail = `"Cybershare Community" <${smtpUser}>`;
  }

  const subject = `[Community Incident Report] @${reportedUsername} reported in "${groupName}": ${reason}`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f15; color: #f0f0f0; border-radius: 12px; overflow: hidden; border: 1px solid #28283c;">
      <div style="background: linear-gradient(135deg, #1e1b4b, #312e81); padding: 24px; border-bottom: 1px solid #4338ca;">
        <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Community Member Incident Report</h2>
        <p style="margin: 6px 0 0; color: #a5b4fc; font-size: 13px;">Cybershare Trust & Safety Automated Dispatch</p>
      </div>

      <div style="padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #9ca3af; width: 140px;">Community Group:</td>
            <td style="padding: 8px 0; color: #f3f4f6; font-weight: 600;">${groupName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #9ca3af;">Reported Member:</td>
            <td style="padding: 8px 0; color: #ef4444; font-weight: 600;">@${reportedUsername}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #9ca3af;">Reported By:</td>
            <td style="padding: 8px 0; color: #818cf8; font-weight: 600;">@${reporterUsername}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #9ca3af;">Reason:</td>
            <td style="padding: 8px 0; color: #f59e0b; font-weight: 600;">${reason}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #9ca3af;">Timestamp:</td>
            <td style="padding: 8px 0; color: #9ca3af;">${new Date().toUTCString()}</td>
          </tr>
        </table>

        ${
          details
            ? `<div style="background: #181825; border: 1px solid #2e2e45; border-radius: 8px; padding: 14px; margin-top: 10px;">
                <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em;">Incident Details & Evidence:</p>
                <p style="margin: 0; font-size: 13.5px; color: #e5e7eb; white-space: pre-wrap; line-height: 1.5;">${details}</p>
              </div>`
            : ""
        }

        <p style="margin-top: 24px; font-size: 12px; color: #6b7280; border-top: 1px solid #222235; padding-top: 16px;">
          This incident was reported by an authorized community administrator. Please investigate this incident according to Cybershare platform community guidelines.
        </p>
      </div>
    </div>
  `;

  const text = `Community Incident Report\n\nGroup: ${groupName}\nReported Member: @${reportedUsername}\nReported By: @${reporterUsername}\nReason: ${reason}\nDetails: ${details || "None provided"}\nTime: ${new Date().toUTCString()}`;

  const mailer = getTransporter();

  if (mailer) {
    try {
      const sendPromise = mailer.sendMail({
        from: fromEmail,
        to: adminEmail,
        subject,
        text,
        html,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("SMTP sendMail timed out after 8s")), 8000)
      );

      const info = await Promise.race([sendPromise, timeoutPromise]);
      console.log(`[emailService] Report email dispatched to ${adminEmail}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error("[emailService] Failed to send report email via SMTP:", err.message);
      // Still log fallback so the report is recorded and not lost
    }
  }

  // Fallback: SMTP not configured or failed - log clearly
  console.log(`[emailService][SIMULATED] Report email to ${adminEmail}:\nSubject: ${subject}\nReason: ${reason}\nDetails: ${details || 'N/A'}`);
  return { success: true, simulated: true };
}

module.exports = {
  sendReportEmail,
};
