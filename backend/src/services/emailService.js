const nodemailer = require("nodemailer");

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER || "").trim();
  const rawPass = process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || "";
  // Strip all whitespace from App Passwords (Google generates them with spaces like 'abcd efgh ijkl mnop')
  const pass = rawPass.replace(/\s+/g, "").trim();
  const service = process.env.SMTP_SERVICE || ((host && host.toLowerCase().includes("gmail")) ? "gmail" : null);

  if ((service || host) && user && pass) {
    const config = service
      ? {
          service,
          auth: { user, pass },
          connectionTimeout: 10000,
          greetingTimeout: 8000,
          socketTimeout: 15000,
        }
      : {
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
          connectionTimeout: 10000,
          greetingTimeout: 8000,
          socketTimeout: 15000,
          tls: {
            rejectUnauthorized: false,
          },
        };

    return nodemailer.createTransport(config);
  }

  return null;
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
        setTimeout(() => reject(new Error("SMTP sendMail timed out after 15s")), 15000)
      );

      const info = await Promise.race([sendPromise, timeoutPromise]);
      console.log(`[emailService] Report email successfully dispatched to ${adminEmail}: ${info.messageId}`);
      return { success: true, messageId: info.messageId, accepted: info.accepted };
    } catch (err) {
      console.error(`[emailService] Failed to send report email via SMTP (${err.code || 'UNKNOWN'}):`, err.message);
      // Still log fallback so the report is recorded and not lost
    }
  }

  // Fallback: SMTP not configured or failed - log clearly
  console.log(`[emailService][SIMULATED] Report email to ${adminEmail}:\nSubject: ${subject}\nReason: ${reason}\nDetails: ${details || 'N/A'}`);
  return { success: true, simulated: true };
}

/**
 * Diagnostic tool to verify SMTP configuration and send a test email
 */
async function diagnoseEmail() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER || "").trim();
  const rawPass = process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || "";
  const pass = rawPass.replace(/\s+/g, "").trim();
  const service = process.env.SMTP_SERVICE || ((host && host.toLowerCase().includes("gmail")) ? "gmail" : null);
  const adminEmail = process.env.REPORT_ADMIN_EMAIL || "walvesoutis@gmail.com";

  const diagnostics = {
    configured: !!((service || host) && user && pass),
    service: service || "custom",
    host: host || (service === "gmail" ? "smtp.gmail.com" : null),
    port: port || (service === "gmail" ? 465 : null),
    userMasked: user ? user.replace(/(.{2})(.*)(@.*)/, "$1***$3") : null,
    passLength: pass ? pass.length : 0,
    hasSpacesInRawPass: rawPass.includes(" "),
    adminEmail,
  };

  if (!diagnostics.configured) {
    return {
      success: false,
      diagnostics,
      error: "SMTP credentials incomplete. Ensure SMTP_USER and SMTP_PASS are set in environment variables.",
    };
  }

  const mailer = getTransporter();
  if (!mailer) {
    return {
      success: false,
      diagnostics,
      error: "Failed to initialize nodemailer transporter.",
    };
  }

  // Step 1: Verify credentials with SMTP server
  try {
    await mailer.verify();
    diagnostics.smtpConnected = true;
  } catch (verifyErr) {
    diagnostics.smtpConnected = false;
    diagnostics.verifyError = {
      message: verifyErr.message,
      code: verifyErr.code,
      response: verifyErr.response,
    };
    return {
      success: false,
      diagnostics,
      error: `SMTP connection failed: ${verifyErr.message}`,
      tip: verifyErr.code === "EAUTH"
        ? "Google rejected credentials. You MUST use a 16-character Google App Password (not your normal Gmail login password) with 2-Step Verification enabled."
        : "Verify network host, port, and security settings.",
    };
  }

  // Step 2: Attempt sending a real diagnostic message
  try {
    const testInfo = await mailer.sendMail({
      from: `"Cybershare Diagnostic" <${user}>`,
      to: adminEmail,
      subject: `[Cybershare Diagnostic] Test Email Delivery Check`,
      text: `Hello! This is a test email verifying that Cybershare reporting email service is working properly.\n\nTime: ${new Date().toUTCString()}\nRecipient: ${adminEmail}\nSender: ${user}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #4338ca; border-radius: 8px; background: #0f0f15; color: #fff;">
          <h3 style="color: #818cf8; margin-top: 0;">Cybershare Email Diagnostic Test</h3>
          <p>This email confirms that your SMTP delivery to <strong>${adminEmail}</strong> is working properly!</p>
          <hr style="border: 0; border-top: 1px solid #28283c;" />
          <p style="font-size: 12px; color: #9ca3af;">Sent at: ${new Date().toUTCString()}</p>
        </div>
      `,
    });

    return {
      success: true,
      diagnostics,
      messageId: testInfo.messageId,
      accepted: testInfo.accepted,
      message: `Diagnostic email successfully dispatched to ${adminEmail}! Please check the Inbox and the Spam/Junk folder.`,
    };
  } catch (sendErr) {
    return {
      success: false,
      diagnostics,
      error: `Failed to deliver test email: ${sendErr.message}`,
    };
  }
}

module.exports = {
  sendReportEmail,
  diagnoseEmail,
};
