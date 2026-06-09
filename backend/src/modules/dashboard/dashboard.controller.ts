import type { RequestHandler } from "express";
import { dashboardService } from "./dashboard.service";

export class DashboardController {
  summary: RequestHandler = async (_req, res, next) => {
    try {
      res.json(await dashboardService.summary());
    } catch (error) {
      next(error);
    }
  };

  recentRequisitions: RequestHandler = async (_req, res, next) => {
    try {
      res.json({ requisitions: await dashboardService.recentRequisitions() });
    } catch (error) {
      next(error);
    }
  };

  statistics: RequestHandler = async (req, res, next) => {
    try {
      res.json(await dashboardService.statistics(req.query));
    } catch (error) {
      next(error);
    }
  };
}

export const dashboardController = new DashboardController();
