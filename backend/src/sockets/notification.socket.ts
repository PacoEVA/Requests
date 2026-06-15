import type { Server } from "socket.io";

/** Emite una notificacion realtime a una sala especifica. */
export function emitNotification(io: Server, room: string, payload: unknown) {
  io.to(room).emit("notification:new", payload);
}
