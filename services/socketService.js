const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const allowedOrigins = [
  'http://localhost:3000',
  'https://https-github-com-melese22-ikram-aut.vercel.app',
  'https://https-github-com-melese22-ikram-automotive-frontend.vercel.app',
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 60000,
    perMessageDeflate: false,
    connectTimeout: 30000,
    allowEIO3: true,
    cookie: false,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.engine.on('initial_headers', (headers, req) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.some(o => origin.startsWith(o))) {
      headers['Access-Control-Allow-Origin'] = origin;
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;

    logger.info({ userId: user.id, workshopId: user.workshop_id, role: user.role, transport: socket.conn.transport.name }, 'Socket connected');

    if (user.workshop_id) {
      socket.join(`workshop:${user.workshop_id}`);
    }
    socket.join(`user:${user.id}`);
    if (user.role === 'SuperAdmin') {
      socket.join('superadmin');
    }

    socket.on('disconnect', (reason) => {
      logger.info({ userId: user.id, reason }, 'Socket disconnected');
    });

    socket.on('error', (err) => {
      logger.error({ err, userId: user.id }, 'Socket error');
    });
  });

  return io;
}

function getIO() {
  return io;
}

function emitToWorkshop(workshopId, event, data) {
  if (io) {
    io.to(`workshop:${workshopId}`).emit(event, data);
  }
}

function emitToAll(event, data) {
  if (io) io.emit(event, data);
}

module.exports = { initSocket, getIO, emitToWorkshop, emitToAll };
