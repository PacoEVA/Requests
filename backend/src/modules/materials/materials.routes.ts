import { Router } from "express";
import { z } from "zod";
import { authenticateInternal, requireRole } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { materialsController } from "./materials.controller";

const materialSchema = z.object({
  itemCode: z.string().max(80).optional(),
  name: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  isRequestable: z.boolean().optional()
});

export const materialsRouter = Router();
export const adminMaterialsRouter = Router();

materialsRouter.get("/", materialsController.listPublic);

adminMaterialsRouter.use(authenticateInternal);
adminMaterialsRouter.get("/", materialsController.listAdmin);
adminMaterialsRouter.post("/", requireRole("Admin", "Compras"), validate(materialSchema), materialsController.create);
adminMaterialsRouter.put("/:id", requireRole("Admin", "Compras"), validate(materialSchema), materialsController.update);
adminMaterialsRouter.patch("/:id/deactivate", requireRole("Admin", "Compras"), materialsController.deactivate);
adminMaterialsRouter.patch("/:id/activate", requireRole("Admin", "Compras"), materialsController.activate);
