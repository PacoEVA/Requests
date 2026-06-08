import type { Server } from "socket.io";

export function emitNotification(io: Server, room: string, payload: unknown) {
  io.to(room).emit("notification:new", payload);
}
