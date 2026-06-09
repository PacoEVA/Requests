import { Router } from "express";
import { z } from "zod";
import { authenticateInternal, requireRole } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { inventoryController } from "./inventory.controller";

const minimumStockSchema = z.object({
  minimumStock: z.number().nonnegative()
});

const adjustSchema = z.object({
  quantity: z.number(),
  notes: z.string().max(500).optional()
});

export const inventoryRouter = Router();

inventoryRouter.use(authenticateInternal);
inventoryRouter.get("/", inventoryController.list);
inventoryRouter.get("/low-stock", inventoryController.lowStock);
inventoryRouter.get("/movements", inventoryController.movements);
inventoryRouter.patch("/:materialId/minimum-stock", requireRole("Admin", "Compras"), validate(minimumStockSchema), inventoryController.updateMinimumStock);
inventoryRouter.post("/:materialId/adjust", requireRole("Admin", "Compras"), validate(adjustSchema), inventoryController.adjust);
