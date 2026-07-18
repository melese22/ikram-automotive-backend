const REQUIRED_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
];

const OPTIONAL_VARS = [
  'PORT',
  'FRONTEND_URL',
  'BACKEND_URL',
  'CHAPA_API_KEY',
  'CHAPA_SECRET_KEY',
  'SMTP_HOST',
  'SMTP_PASS',
];

function validateEnv() {
  const missing = REQUIRED_VARS.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

module.exports = { validateEnv };
