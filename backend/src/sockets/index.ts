import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { allowedClientOrigins, env } from "../config/env";
import { authRepository } from "../modules/auth/auth.repository";
import { employeesService } from "../modules/employees/employees.service";
import { notificationsService } from "../modules/notifications/notifications.service";
import { requisitionsRepository } from "../modules/requisitions/requisitions.repository";
import type { AuthenticatedUser } from "../modules/auth/auth.types";
import { setSocketServer } from "./socket-hub";

export function configureSockets(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedClientOrigins,
      credentials: true
    }
  });

  setSocketServer(io);

  io.on("connection", (socket) => {
    socket.on("employee:join", async ({ employeeToken }: { employeeToken?: string }) => {
      try {
        if (!employeeToken) throw new Error("employeeToken requerido");
        const employee = await employeesService.getSessionByToken(employeeToken);

        socket.data.employee = employee;
        socket.join(`employee:${employee.id}`);
      } catch {
        socket.emit("socket:error", { code: "INVALID_EMPLOYEE_TOKEN", message: "Identidad de empleado inválida" });
      }
    });

    socket.on("admin:join", async ({ token }: { token?: string }) => {
      try {
        if (!token) throw new Error("token requerido");
        const user = jwt.verify(token, env.JWT_SECRET) as unknown as AuthenticatedUser;
        const currentUser = await authRepository.findById(user.id);
        if (!currentUser?.isActive) throw new Error("usuario inactivo");

        const socketUser: AuthenticatedUser = {
          ...user,
          role: currentUser.role,
          fullName: currentUser.fullName,
          username: currentUser.username,
          requirePasswordChange: currentUser.requirePasswordChange
        };

        socket.data.user = socketUser;
        socket.join(`role:${socketUser.role}`);
        socket.join(`internalUser:${socketUser.id}`);

        if (socketUser.role === "Admin" || socketUser.role === "Compras") {
          socket.join("dashboard:admins");
        }
      } catch {
        socket.emit("socket:error", { code: "INVALID_TOKEN", message: "Token inválido" });
      }
    });

    socket.on("requisition:join", async ({ requisitionId, employeeToken, token }: { requisitionId?: number; employeeToken?: string; token?: string }) => {
      try {
        if (!requisitionId) throw new Error("requisitionId requerido");

        if (!socket.data.employee && employeeToken) {
          const employee = await employeesService.getSessionByToken(employeeToken);
          socket.data.employee = employee;
          socket.join(`employee:${employee.id}`);
        }

        if (!socket.data.user && token) {
          const user = jwt.verify(token, env.JWT_SECRET) as unknown as AuthenticatedUser;
          const currentUser = await authRepository.findById(user.id);
          if (!currentUser?.isActive) throw new Error("usuario inactivo");

          const socketUser: AuthenticatedUser = {
            ...user,
            role: currentUser.role,
            fullName: currentUser.fullName,
            username: currentUser.username,
            requirePasswordChange: currentUser.requirePasswordChange
          };

          socket.data.user = socketUser;
          socket.join(`role:${socketUser.role}`);
          socket.join(`internalUser:${socketUser.id}`);

          if (socketUser.role === "Admin" || socketUser.role === "Compras") {
            socket.join("dashboard:admins");
          }
        }

        if (socket.data.employee) {
          const requisition = await requisitionsRepository.findForEmployee(requisitionId, socket.data.employee.id);
          if (!requisition) throw new Error("sin permiso");
        } else if (socket.data.user) {
          const requisition = await requisitionsRepository.findForAdmin(requisitionId);
          if (!requisition) throw new Error("sin permiso");
        } else {
          throw new Error("socket no autenticado");
        }

        socket.join(`requisition:${requisitionId}`);
      } catch {
        socket.emit("socket:error", { code: "REQUISITION_JOIN_DENIED", message: "No se pudo unir a la requisición" });
      }
    });

    socket.on("requisition:leave", ({ requisitionId }: { requisitionId?: number }) => {
      if (requisitionId) socket.leave(`requisition:${requisitionId}`);
    });

    socket.on("notification:read", async ({ notificationId }: { notificationId?: number }) => {
      try {
        if (!notificationId) throw new Error("notificationId requerido");
        const notification = await notificationsService.markRead(notificationId, {
          employeeId: socket.data.employee?.id,
          internalUserId: socket.data.user?.id
        });

        if (notification) socket.emit("notification:read", { notificationId });
      } catch {
        socket.emit("socket:error", { code: "NOTIFICATION_READ_FAILED", message: "No se pudo marcar la notificación" });
      }
    });
  });

  return io;
}
