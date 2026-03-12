import { Server } from 'socket.io';

let io;

export function initSocket(httpServer, corsOrigin) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('audio:control', (data) => {
      io.emit('audio:update', data);
    });

    socket.on('announce', (data) => {
      io.emit('announce', data);
    });

    socket.on('timer:show', (visible) => {
      io.emit('timer:show', visible);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}
