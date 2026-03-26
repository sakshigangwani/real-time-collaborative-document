// socketHandler.js
// This is where ALL real-time logic will live (Phase 5+)
// Right now it just logs connections so we can verify Socket.io works

module.exports = function (io) {

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Will be implemented in Phase 5:
    // socket.on('join-document', ...)   — join a document room
    // socket.on('operation', ...)       — receive and broadcast ops
    // socket.on('cursor-move', ...)     — broadcast cursor position
    // socket.on('selection-change', ...)— broadcast text selection
    // socket.on('typing', ...)          — broadcast typing indicator

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

};