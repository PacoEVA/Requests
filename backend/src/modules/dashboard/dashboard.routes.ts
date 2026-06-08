import { Router } from "express";
import { authenticateInternal } from "../../middlewares/auth.middleware";
import { dashboardController } from "./dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.use(authenticateInternal);
dashboardRouter.get("/summary", dashboardController.summary);
dashboardRouter.get("/recent-requisitions", dashboardController.recentRequisitions);
dashboardRouter.get("/statistics", dashboardController.statistics);
