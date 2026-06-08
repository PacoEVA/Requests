import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { allowedClientOrigins } from "../config/env";

export function configureSockets(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedClientOrigins,
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    socket.on("employee:join", ({ employeeId }: { employeeId?: number }) => {
      if (employeeId) socket.join(`employee:${employeeId}`);
    });

    socket.on("admin:join", ({ role }: { role?: string }) => {
      if (role) socket.join(`role:${role}`);
    });
  });

  return io;
}
