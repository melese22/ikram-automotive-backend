const nodemailer = require('nodemailer');
const twilio = require('twilio');

let transporter = null;
let twilioClient = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporter;
}

function getTwilioClient() {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

async function sendEmail({ to, subject, text, html }) {
  try {
    const transport = getTransporter();
    const info = await transport.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Ikram Automotive'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html: html || text,
    });
    return { success: true, messageId: info.messageId, response: info.response };
  } catch (err) {
    console.error('Email send error:', err);
    return { success: false, error: err.message };
  }
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