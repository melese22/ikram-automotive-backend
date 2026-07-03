const https = require('https');
const twilio = require('twilio');

let twilioClient = null;

function getTwilioClient() {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

async function sendEmail({ to, subject, text, html }) {
  const apiKey = process.env.SMTP_PASS;
  const fromName = process.env.SMTP_FROM_NAME || 'Ikram Automotive';
  const fromEmail = process.env.SMTP_FROM || 'onboarding@resend.dev';

  if (apiKey && apiKey.startsWith('re_')) {
    return sendViaResend({ apiKey, from: `${fromName} <${fromEmail}>`, to, subject, text, html });
  }

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: apiKey },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to, subject, text, html: html || text,
    });
    return { success: true, messageId: info.messageId, response: info.response };
  } catch (err) {
    console.error('Email send error:', err);
    return { success: false, error: err.message };
  }
}

function sendViaResend({ apiKey, from, to, subject, text, html }) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, text, html: html || text });
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: 15000,
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode === 200) {
            resolve({ success: true, messageId: parsed.id, response: `Resend: ${parsed.id}` });
          } else {
            resolve({ success: false, error: parsed.message || parsed.error || body });
          }
        } catch {
          resolve({ success: false, error: body });
        }
      });
    });
    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'Resend API timed out' }); });
    req.write(data);
    req.end();
  });
}

async function sendSMS({ to, message }) {
  try {
    const client = getTwilioClient();
    if (!client) {
      return { success: false, error: 'Twilio not configured' };
    }
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    return { success: true, messageId: result.sid, response: result.status };
  } catch (err) {
    console.error('SMS send error:', err);
    return { success: false, error: err.message };
  }
}

async function sendNotification({ type, to, subject, message }) {
  if (type === 'email') {
    return sendEmail({ to, subject, text: message });
  } else if (type === 'sms') {
    return sendSMS({ to, message });
  }
  return { success: false, error: `Unknown notification type: ${type}` };
}

module.exports = { sendNotification, sendEmail, sendSMS };