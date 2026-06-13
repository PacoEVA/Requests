import { Router } from "express";
import { authenticateEmployeeOrInternal } from "../../middlewares/requisition-access.middleware";
import { notificationsController } from "./notifications.controller";

export const notificationsRouter = Router();

notificationsRouter.use(authenticateEmployeeOrInternal);
notificationsRouter.get("/unread", notificationsController.listUnread);
notificationsRouter.patch("/:id/read", notificationsController.markRead);
