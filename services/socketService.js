const { Server } = require('socket.io');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    const { workshopId, userId, role } = socket.handshake.query;

    if (workshopId) {
      socket.join(`workshop:${workshopId}`);
    }
    if (userId) {
      socket.join(`user:${userId}`);
    }
    if (role === 'SuperAdmin') {
      socket.join('superadmin');
    }

    socket.on('disconnect', () => {});
  });

  return io;
}

function getIO() {
  return io;
}

function emitToWorkshop(workshopId, event, data) {
  if (io) io.to(`workshop:${workshopId}`).emit(event, data);
}

function emitToAll(event, data) {
  if (io) io.emit(event, data);
}

module.exports = { initSocket, getIO, emitToWorkshop, emitToAll };
