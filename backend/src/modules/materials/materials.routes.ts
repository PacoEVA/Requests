import { Router } from "express";
import { z } from "zod";
import { authenticateInternal, requireRole } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { materialsController } from "./materials.controller";

const materialSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  categoryId: z.number().int().positive().optional(),
  unitOfMeasure: z.string().max(50).optional(),
  isRequestable: z.boolean().optional()
});

const categorySchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(300).optional()
});

export const materialsRouter = Router();
export const adminMaterialsRouter = Router();
export const materialCategoriesRouter = Router();
export const adminMaterialCategoriesRouter = Router();

materialsRouter.get("/", materialsController.listPublic);

adminMaterialsRouter.use(authenticateInternal);
adminMaterialsRouter.get("/", materialsController.listAdmin);
adminMaterialsRouter.post("/", requireRole("Admin", "Compras"), validate(materialSchema), materialsController.create);
adminMaterialsRouter.put("/:id", requireRole("Admin", "Compras"), validate(materialSchema), materialsController.update);
adminMaterialsRouter.patch("/:id/deactivate", requireRole("Admin", "Compras"), materialsController.deactivate);
adminMaterialsRouter.patch("/:id/activate", requireRole("Admin", "Compras"), materialsController.activate);

materialCategoriesRouter.get("/", materialsController.listCategoriesPublic);

adminMaterialCategoriesRouter.use(authenticateInternal);
adminMaterialCategoriesRouter.get("/", materialsController.listCategoriesAdmin);
adminMaterialCategoriesRouter.post("/", requireRole("Admin", "Compras"), validate(categorySchema), materialsController.createCategory);
adminMaterialCategoriesRouter.put("/:id", requireRole("Admin", "Compras"), validate(categorySchema), materialsController.updateCategory);
adminMaterialCategoriesRouter.patch("/:id/deactivate", requireRole("Admin", "Compras"), materialsController.deactivateCategory);
