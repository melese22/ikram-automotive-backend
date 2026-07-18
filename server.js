require('dotenv').config();
const { validateEnv } = require('./config/env');
validateEnv();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const logger = require('./config/logger');

const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const jobCardRoutes = require('./routes/jobCardRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const milestoneRoutes = require('./routes/milestoneRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const partRoutes = require('./routes/partRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const workshopRoutes = require('./routes/workshopRoutes');
const workshopSettingsRoutes = require('./routes/workshopSettingsRoutes');
const userManagementRoutes = require('./routes/userManagementRoutes');
const companyRoutes = require('./routes/companyRoutes');
const transferRoutes = require('./routes/transferRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const loyaltyRoutes = require('./routes/loyaltyRoutes');

const { initSocket } = require('./services/socketService');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

app.use(helmet());
const allowedOrigins = [
  'http://localhost:3000',
  'https://https-github-com-melese22-ikram-aut.vercel.app',
  'https://https-github-com-melese22-ikram-automotive-frontend.vercel.app',
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});
app.use('/api/auth/login', authLimiter);

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.' },
});
app.use('/api/auth/register', registerLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    name: 'Ikram Automotive API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      vehicles: '/api/vehicles',
      jobCards: '/api/job-cards',
      media: '/api/media',
      milestones: '/api/milestones',
      tracking: '/api/tracking',
      notifications: '/api/notifications',
      parts: '/api/parts',
      invoices: '/api/invoices',
      appointments: '/api/appointments',
      reports: '/api/reports',
      workshops: '/api/workshops',
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/job-cards', jobCardRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/workshops', workshopRoutes);
app.use('/api/workshop-settings', workshopSettingsRoutes);
app.use('/api/user-management', userManagementRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/loyalty', loyaltyRoutes);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Max 50MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message?.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error.' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

initSocket(server);

server.listen(PORT, () => {
  logger.info({ port: PORT }, 'Ikram Automotive API running');
  logger.info({ url: `http://localhost:${PORT}/api/health` }, 'Health check');
  logger.info('WebSocket server initialized');
});

module.exports = { app, server };
