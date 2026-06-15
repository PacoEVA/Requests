import type { RequestHandler } from "express";
import { AppError } from "../../middlewares/error.middleware";
import { dashboardService } from "./dashboard.service";

export class DashboardController {
  /** Devuelve conteos resumidos de requisiciones visibles para el usuario. */
  summary: RequestHandler = async (req, res, next) => {
    try {
      if (!req.user) throw new AppError("Usuario no autenticado", 401, "AUTH_REQUIRED");
      res.json(await dashboardService.summary(req.user));
    } catch (error) {
      next(error);
    }
  };

  /** Devuelve las requisiciones recientes que el usuario puede ver. */
  recentRequisitions: RequestHandler = async (req, res, next) => {
    try {
      if (!req.user) throw new AppError("Usuario no autenticado", 401, "AUTH_REQUIRED");
      res.json({ requisitions: await dashboardService.recentRequisitions(req.user) });
    } catch (error) {
      next(error);
    }
  };

  /** Devuelve rankings, tendencias y metricas filtradas para reportes. */
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
