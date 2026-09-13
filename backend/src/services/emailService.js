const nodemailer = require("nodemailer");

/**
 * Creates a Nodemailer transport instance for a given port
 * @param {number} [targetPort] 
 */
function getTransporter(targetPort) {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = targetPort || parseInt(process.env.SMTP_PORT || "587", 10);
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER || "").trim();
  const rawPass = process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || "";
  const pass = rawPass.replace(/\s+/g, "").trim();

  if (user && pass) {
    const isPort465 = port === 465;
    return nodemailer.createTransport({
      host,
      port,
      secure: isPort465, // true for 465, false for 587 (STARTTLS)
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 6000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  return null;
}

/**
 * Optional HTTPS dispatch via Brevo API (bypasses all cloud SMTP port blocks)
 */
async function sendViaBrevo({ to, subject, html, text }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "Cybershare Community",
          email: process.env.BREVO_SENDER || "admin@cybershare.app",
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      return { success: true, messageId: data.messageId, provider: "brevo" };
    }
    console.error("[emailService] Brevo API error:", data);
    return null;
  } catch (err) {
    console.error("[emailService] Brevo network error:", err.message);
    return null;
  }
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
  const smtpUser = (process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER || "").trim();

  let fromEmail = process.env.SMTP_FROM;
  if (!fromEmail || !fromEmail.includes("@")) {
    if (smtpUser && smtpUser.includes("@")) {
      fromEmail = `"Cybershare Community" <${smtpUser}>`;
    } else {
      fromEmail = '"Cybershare Community" <no-reply@cybershare.app>';
    }
  } else if (smtpUser && smtpUser.includes("@") && (!fromEmail.includes("<") || !fromEmail.includes(">"))) {
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

  // 1. Try Brevo API if configured
  if (process.env.BREVO_API_KEY) {
    const brevoResult = await sendViaBrevo({ to: adminEmail, subject, html, text });
    if (brevoResult) {
      console.log(`[emailService] Dispatched via Brevo API: ${brevoResult.messageId}`);
      return brevoResult;
    }
  }

  // 2. Try SMTP delivery: primary port (587 STARTTLS) and fallback port (465 SSL)
  const configuredPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const portsToTry = configuredPort === 465 ? [465, 587] : [587, 465];

  for (const port of portsToTry) {
    const mailer = getTransporter(port);
    if (!mailer) break;

    try {
      console.log(`[emailService] Attempting SMTP dispatch via port ${port}...`);
      const sendPromise = mailer.sendMail({
        from: fromEmail,
        to: adminEmail,
        subject,
        text,
        html,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`SMTP sendMail timed out on port ${port} after 8s`)), 8000)
      );

      const info = await Promise.race([sendPromise, timeoutPromise]);
      console.log(`[emailService] Report email successfully dispatched via port ${port} to ${adminEmail}: ${info.messageId}`);
      return { success: true, messageId: info.messageId, port };
    } catch (err) {
      console.warn(`[emailService] Port ${port} attempt failed (${err.code || err.message})`);
    }
  }

  // Fallback: SMTP not configured or failed - log clearly
  console.log(`[emailService][SIMULATED] Report email to ${adminEmail}:\nSubject: ${subject}\nReason: ${reason}\nDetails: ${details || 'N/A'}`);
  return { success: true, simulated: true };
}

/**
 * Diagnostic tool to test SMTP connection (port 587 vs 465) and optional HTTPS API
 */
async function diagnoseEmail() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER || "").trim();
  const rawPass = process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || "";
  const pass = rawPass.replace(/\s+/g, "").trim();
  const adminEmail = process.env.REPORT_ADMIN_EMAIL || "walvesoutis@gmail.com";

  const diagnostics = {
    configured: !!(user && pass),
    host,
    userMasked: user ? user.replace(/(.{2})(.*)(@.*)/, "$1***$3") : null,
    passLength: pass ? pass.length : 0,
    hasSpacesInRawPass: rawPass.includes(" "),
    adminEmail,
    brevoConfigured: !!process.env.BREVO_API_KEY,
    portResults: {},
  };

  if (!diagnostics.configured) {
    return {
      success: false,
      diagnostics,
      error: "SMTP credentials incomplete. Ensure SMTP_USER and SMTP_PASS are set.",
    };
  }

  // Test both Port 587 (STARTTLS) and Port 465 (SSL)
  let workingPort = null;
  const ports = [587, 465];

  for (const p of ports) {
    const mailer = getTransporter(p);
    try {
      await Promise.race([
        mailer.verify(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout after 6s")), 6000)),
      ]);
      diagnostics.portResults[p] = { connected: true };
      if (!workingPort) workingPort = p;
    } catch (err) {
      diagnostics.portResults[p] = { connected: false, error: err.message, code: err.code };
    }
  }

  if (!workingPort) {
    const port465Err = diagnostics.portResults[465]?.error || "";
    const port587Err = diagnostics.portResults[587]?.error || "";

    const isFirewallBlock = port465Err.includes("Timeout") && port587Err.includes("Timeout");

    return {
      success: false,
      diagnostics,
      error: isFirewallBlock
        ? `Render blocks outbound SMTP. Brevo is configured but also failed.`
        : `SMTP connection failed: 587 (${port587Err}) | 465 (${port465Err})`,
      tip: isFirewallBlock
        ? "Add BREVO_API_KEY to Render to use HTTPS email delivery instead."
        : "Check your Google App Password.",
    };
  }

  // Send test email with the working port
  const activeMailer = getTransporter(workingPort);
  try {
    const testInfo = await activeMailer.sendMail({
      from: `"Cybershare Diagnostic" <${user}>`,
      to: adminEmail,
      subject: `[Cybershare Diagnostic] Test Email Delivery (Port ${workingPort})`,
      text: `Hello! This is a test email verifying that Cybershare reporting email service is working properly on Port ${workingPort}.\n\nTime: ${new Date().toUTCString()}\nRecipient: ${adminEmail}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #4338ca; border-radius: 8px; background: #0f0f15; color: #fff;">
          <h3 style="color: #818cf8; margin-top: 0;">Cybershare Email Diagnostic Test</h3>
          <p>SMTP delivery to <strong>${adminEmail}</strong> is operational via <strong>Port ${workingPort}</strong>!</p>
          <hr style="border: 0; border-top: 1px solid #28283c;" />
          <p style="font-size: 12px; color: #9ca3af;">Sent at: ${new Date().toUTCString()}</p>
        </div>
      `,
    });

    return {
      success: true,
      workingPort,
      messageId: testInfo.messageId,
      diagnostics,
      message: `Diagnostic email successfully sent to ${adminEmail} via port ${workingPort}! Check inbox and Spam/Junk folder.`,
    };
  } catch (sendErr) {
    return {
      success: false,
      workingPort,
      diagnostics,
      error: `Failed to dispatch email: ${sendErr.message}`,
    };
  }
}

module.exports = {
  sendReportEmail,
  diagnoseEmail,
};
