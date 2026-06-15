import type { Server } from "socket.io";

let io: Server | null = null;

/** Guarda la instancia global de Socket.IO para emitir desde servicios. */
export function setSocketServer(server: Server) {
  io = server;
}

/** Devuelve la instancia global de Socket.IO si ya fue configurada. */
export function getSocketServer() {
  return io;
}

/** Ejecuta emisiones socket sin romper la operacion principal si fallan. */
export async function safeEmit(callback: (server: Server) => void | Promise<void>) {
  if (!io) return;

  try {
    await callback(io);
  } catch (error) {
    console.error("Socket emit failed", error);
  }
}
