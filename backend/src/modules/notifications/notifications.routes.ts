import { Router } from "express";
import { authenticateEmployeeOrInternal } from "../../middlewares/requisition-access.middleware";
import { notificationsController } from "./notifications.controller";

export const notificationsRouter = Router();

// Todas las rutas aceptan identidad de empleado o token interno.
notificationsRouter.use(authenticateEmployeeOrInternal);
// Devuelve las notificaciones pendientes para pintar el contador inicial.
notificationsRouter.get("/unread", notificationsController.listUnread);
// Permite limpiar una notificacion del contador desde campana o auto-lectura.
notificationsRouter.patch("/:id/read", notificationsController.markRead);
