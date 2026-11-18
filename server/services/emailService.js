// server/services/emailService.js
// ═══════════════════════════════════════════════════════════════════════════
// TRANSACTIONAL EMAIL DISPATCH SERVICE (RESEND API INTEGRATION)
// ═══════════════════════════════════════════════════════════════════════════

const https = require('https');
const SITE_URL = (process.env.APP_URL || 'https://extreme-sales-services.vercel.app').replace(/\/$/, '');

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'Extreme Sales & Services <onboarding@resend.dev>';
const REPLY_TO = 'extremess0121@gmail.com';

/**
 * Sends an email via Resend REST API
 */
async function sendResendMail({ to, subject, html, text }) {
  if (!to || !to.includes('@')) {
    return { success: false, message: 'Invalid recipient email' };
  }

  const payload = JSON.stringify({
    from: RESEND_FROM,
    to: [to],
    reply_to: REPLY_TO,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  });

  return new Promise((resolve) => {
    const req = https.request(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 10000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log(`[Resend] Successfully delivered email to ${to} (ID: ${data.id})`);
              resolve({ success: true, id: data.id });
            } else {
              console.warn(`[Resend] API returned status ${res.statusCode}:`, data);
              resolve({ success: false, error: data.message || 'Resend API error' });
            }
          } catch (err) {
            resolve({ success: false, error: err.message });
          }
        });
      }
    );

    req.on('error', (err) => {
      console.error('[Resend] Network request error:', err.message);
      resolve({ success: false, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('[Resend] Request timed out');
      resolve({ success: false, error: 'Resend request timeout' });
    });

    req.write(payload);
    req.end();
  });
}

const emailService = {
  // Send booking confirmation email
  async sendBookingEmail(customerEmail, customerName, requestId, serviceType, phone) {
    if (!customerEmail) {
      return { success: false, message: 'Recipient email missing' };
    }

    const subject = `✅ Service Request Confirmed - ${requestId}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="margin: 0; font-size: 24px;">Service Request Confirmed! ✅</h2>
          <p style="margin: 5px 0 0; opacity: 0.9;">Extreme Sales & Services</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="margin: 10px 0; font-size: 16px;">Hi <strong>${customerName || 'Valued Customer'}</strong>,</p>
          
          <p style="margin: 20px 0; color: #555;">Your AC service request has been successfully received and scheduled. Our certified technician will attend to your unit shortly.</p>
          
          <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 5px 0;"><strong>Request Details:</strong></p>
            <p style="margin: 5px 0;"><strong>Request ID:</strong> <span style="font-size: 18px; color: #2563eb; font-weight: bold;">${requestId}</span></p>
            <p style="margin: 5px 0;"><strong>Service Type:</strong> ${serviceType}</p>
            <p style="margin: 5px 0;"><strong>Contact Phone:</strong> ${phone}</p>
          </div>

          <p style="margin: 20px 0; color: #555;"><strong>Next Steps:</strong></p>
          <ul style="margin: 10px 0; color: #555; line-height: 1.6;">
            <li>Our dispatch coordinator is assigning the nearest certified technician.</li>
            <li>You can track live milestone status here: <a href="${SITE_URL}/status.html?id=${encodeURIComponent(requestId)}" style="color: #2563eb; font-weight: bold;">Live Service Tracker</a></li>
            <li>All services comply with Statutory SAC 998719 guidelines.</li>
          </ul>

          <p style="margin: 20px 0; color: #555;">Need assistance? Reply directly to this email or call our 24/7 hotline at +91 79778 05245.</p>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="margin: 10px 0; font-size: 12px; color: #999;">
            <strong>Extreme Sales & Services</strong><br>
            Authorized Sales & Multi-Brand HVAC Care<br>
            Chembur, Mumbai, Maharashtra 400071
          </p>
        </div>
      </div>
    `;

    return sendResendMail({ to: customerEmail, subject, html });
  },

  // Send status update email
  async sendStatusUpdateEmail(customerEmail, customerName, requestId, newStatus, serviceType) {
    if (!customerEmail) {
      return { success: false, message: 'Recipient email missing' };
    }

    const statusColors = {
      'Pending': '#f59e0b',
      'Assigned': '#3b82f6',
      'In Progress': '#8b5cf6',
      'Completed': '#10b981',
      'Cancelled': '#ef4444',
    };

    const statusEmojis = {
      'Pending': '⏳',
      'Assigned': '👨‍🔧',
      'In Progress': '🔧',
      'Completed': '✅',
      'Cancelled': '❌',
    };

    const statusColor = statusColors[newStatus] || '#2563eb';
    const statusEmoji = statusEmojis[newStatus] || '📋';

    const subject = `${statusEmoji} Service Update - ${requestId} is now ${newStatus}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">${statusEmoji} Service Status Update</h2>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="margin: 10px 0; font-size: 16px;">Hi <strong>${customerName || 'Valued Customer'}</strong>,</p>
          
          <p style="margin: 20px 0; color: #555;">Your service request status has been updated:</p>
          
          <div style="background: ${statusColor}15; border-left: 4px solid ${statusColor}; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 5px 0;"><strong>Request ID:</strong> ${requestId}</p>
            <p style="margin: 5px 0;"><strong>Service Type:</strong> ${serviceType}</p>
            <p style="margin: 5px 0;"><strong>New Status:</strong> <span style="font-size: 18px; font-weight: bold; color: ${statusColor};">${statusEmoji} ${newStatus}</span></p>
          </div>

          <p style="margin: 20px 0;">
            <a href="${SITE_URL}/status.html?id=${encodeURIComponent(requestId)}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Track Your Service Live →
            </a>
          </p>

          <p style="margin: 20px 0; font-size: 12px; color: #999;">
            <strong>Extreme Sales & Services</strong><br>
            Support: extremess0121@gmail.com
          </p>
        </div>
      </div>
    `;

    return sendResendMail({ to: customerEmail, subject, html });
  },

  // Send AMC subscription confirmation
  async sendAMCConfirmationEmail(customerEmail, customerName, planName, phone) {
    if (!customerEmail) {
      return { success: false, message: 'Recipient email missing' };
    }

    const subject = `🛡️ AMC Plan Request Received - ${planName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="margin: 0; font-size: 24px;">🛡️ AMC Protection Request</h2>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="margin: 10px 0; font-size: 16px;">Hi <strong>${customerName || 'Valued Customer'}</strong>,</p>
          
          <p style="margin: 20px 0; color: #555;">Thank you for selecting our Annual Maintenance Contract (AMC)!</p>
          
          <div style="background: #f3e8ff; border-left: 4px solid #8b5cf6; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 5px 0;"><strong>Plan Selected:</strong> ${planName}</p>
            <p style="margin: 5px 0;"><strong>Registered Phone:</strong> ${phone}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #8b5cf6; font-weight: bold;">Verification in Progress</span></p>
          </div>

          <p style="margin: 20px 0; color: #555;"><strong>Coverage Highlights:</strong></p>
          <ul style="margin: 10px 0; color: #555; line-height: 1.6;">
            <li>✅ Periodic preventive deep cleaning (Jet / Wet Washes)</li>
            <li>✅ Priority breakdown attendance within 4 business hours</li>
            <li>✅ Genuine OEM spare parts & certified technicians</li>
          </ul>

          <p style="margin: 20px 0; color: #555;">Our relationship manager will contact you to finalize the contract and asset inspection schedule.</p>

          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="margin: 10px 0; font-size: 12px; color: #999;">
            <strong>Extreme Sales & Services</strong><br>
            Hotline: +91 79778 05245 | Chembur, Mumbai
          </p>
        </div>
      </div>
    `;

    return sendResendMail({ to: customerEmail, subject, html });
  },
};

module.exports = emailService;
