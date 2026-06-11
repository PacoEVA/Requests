import type { RequestHandler } from "express";
import { AppError } from "../../middlewares/error.middleware";
import { dashboardService } from "./dashboard.service";

export class DashboardController {
  summary: RequestHandler = async (req, res, next) => {
    try {
      if (!req.user) throw new AppError("Usuario no autenticado", 401, "AUTH_REQUIRED");
      res.json(await dashboardService.summary(req.user));
    } catch (error) {
      next(error);
    }
  };

  recentRequisitions: RequestHandler = async (req, res, next) => {
    try {
      if (!req.user) throw new AppError("Usuario no autenticado", 401, "AUTH_REQUIRED");
      res.json({ requisitions: await dashboardService.recentRequisitions(req.user) });
    } catch (error) {
      next(error);
    }
  };

  statistics: RequestHandler = async (req, res, next) => {
    try {
      if (!req.user) throw new AppError("Usuario no autenticado", 401, "AUTH_REQUIRED");
      res.json(await dashboardService.statistics(req.user, req.query));
    } catch (error) {
      next(error);
    }
  };
}

export const dashboardController = new DashboardController();
