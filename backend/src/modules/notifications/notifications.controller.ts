import type { Request, RequestHandler } from "express";
import { AppError } from "../../middlewares/error.middleware";
import { notificationsService } from "./notifications.service";

function currentRecipient(req: Request) {
  if (req.employee) {
    return { employeeId: req.employee.id };
  }

  if (req.user) {
    return { internalUserId: req.user.id, roleName: req.user.role };
  }

  throw new AppError("Autenticacion requerida", 401, "AUTH_REQUIRED");
}

export class NotificationsController {
  listUnread: RequestHandler = async (req, res, next) => {
    try {
      const notifications = await notificationsService.listUnread(currentRecipient(req));
      res.json({ notifications });
    } catch (error) {
      next(error);
    }
  };

  markRead: RequestHandler = async (req, res, next) => {
    try {
      const notificationId = Number(req.params.id);
      if (!Number.isInteger(notificationId) || notificationId <= 0) {
        throw new AppError("Id invalido", 400, "INVALID_ID");
      }

      const notification = await notificationsService.markRead(notificationId, currentRecipient(req));
      if (!notification) {
        throw new AppError("Notificacion no encontrada", 404, "NOTIFICATION_NOT_FOUND");
      }

      res.json({ notification });
    } catch (error) {
      next(error);
    }
  };
}

export const notificationsController = new NotificationsController();
