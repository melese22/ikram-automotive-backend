const https = require('https');

const CHAPA_API = 'https://api.chapa.co/v1';
const CHAPA_API_KEY = process.env.CHAPA_API_KEY || '';

async function initPayment({ amount, email, firstName, lastName, txRef, callbackUrl, returnUrl }) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      amount: amount.toString(),
      currency: 'ETB',
      email,
      first_name: firstName,
      last_name: lastName,
      tx_ref: txRef,
      callback_url: callbackUrl,
      return_url: returnUrl,
      customization: { title: 'Ikram Auto Pay' },
    });

    const req = https.request({
      hostname: 'api.chapa.co',
      path: '/v1/transaction/initialize',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CHAPA_API_KEY}`,
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
          resolve(parsed);
        } catch {
          resolve({ status: 'error', message: body });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Chapa API timed out')); });
    req.write(data);
    req.end();
  });
}

async function verifyPayment(txRef) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.chapa.co',
      path: `/v1/transaction/verify/${txRef}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${CHAPA_API_KEY}` },
      timeout: 15000,
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch {
          resolve({ status: 'error', message: body });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Chapa verify timed out')); });
    req.end();
  });
}

module.exports = { initPayment, verifyPayment };
