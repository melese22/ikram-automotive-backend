const { Server } = require('socket.io');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
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

  io.engine.on('initial_headers', (headers) => {
    headers['Access-Control-Allow-Origin'] = '*';
  });

  io.on('connection', (socket) => {
    const { workshopId, userId, role } = socket.handshake.query;

    console.log(`[Socket] Connected: user=${userId}, workshop=${workshopId}, role=${role}, transport=${socket.conn.transport.name}`);

    if (workshopId) {
      socket.join(`workshop:${workshopId}`);
    }
    if (userId) {
      socket.join(`user:${userId}`);
    }
    if (role === 'SuperAdmin') {
      socket.join('superadmin');
    }

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: user=${userId}, reason=${reason}`);
    });

    socket.on('error', (err) => {
      console.error(`[Socket] Error: user=${userId}`, err.message);
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
