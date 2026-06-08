import type { RequestHandler } from "express";
import { AppError } from "../../middlewares/error.middleware";
import { inventoryService } from "./inventory.service";

function numericId(value: string | undefined) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError("Id inválido", 400, "INVALID_ID");
  return id;
}

export class InventoryController {
  list: RequestHandler = async (_req, res, next) => {
    try {
      res.json({ inventory: await inventoryService.list() });
    } catch (error) {
      next(error);
    }
  };

  lowStock: RequestHandler = async (_req, res, next) => {
    try {
      res.json({ inventory: await inventoryService.lowStock() });
    } catch (error) {
      next(error);
    }
  };

  updateMinimumStock: RequestHandler = async (req, res, next) => {
    try {
      await inventoryService.updateMinimumStock(numericId(req.params.materialId), req.body.minimumStock);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  adjust: RequestHandler = async (req, res, next) => {
    try {
      if (!req.user) throw new AppError("Usuario no autenticado", 401, "AUTH_REQUIRED");
      await inventoryService.adjust(numericId(req.params.materialId), req.body.quantity, req.user.id, req.body.notes);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  movements: RequestHandler = async (_req, res, next) => {
    try {
      res.json({ movements: await inventoryService.movements() });
    } catch (error) {
      next(error);
    }
  };
}

export const inventoryController = new InventoryController();
