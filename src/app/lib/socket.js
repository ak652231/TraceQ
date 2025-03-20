// src/app/lib/socket.js
const { Server: SocketIOServer } = require("socket.io");

if (!globalThis.io) {
  globalThis.io = null;
}

function initSocketIO(server) {
  if (!globalThis.io) {
    globalThis.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXTAUTH_URL || "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    console.log("Socket.IO server initializing in lib");
    globalThis.io.on("connection", (socket) => {
      console.log(`Socket connected: ${socket.id}`);

      socket.on("authenticate", (userId) => {
        if (userId) {
          socket.join(userId);
          console.log(`User ${userId} authenticated and joined room`);
        }
      });

      
      socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
      });
    });

    console.log("Socket.IO server initialized");
  }
  return globalThis.io;
}

function getSocketIO() {
  if (!globalThis.io) {
    throw new Error("Socket.IO has not been initialized. Please call initSocketIO first.");
  }
  return globalThis.io;
}

module.exports = { initSocketIO, getSocketIO };