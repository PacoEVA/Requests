import type { Server } from "socket.io";

let io: Server | null = null;

export function setSocketServer(server: Server) {
  io = server;
}

export function getSocketServer() {
  return io;
}

export async function safeEmit(callback: (server: Server) => void | Promise<void>) {
  if (!io) return;

  try {
    await callback(io);
  } catch (error) {
    console.error("Socket emit failed", error);
  }
}
