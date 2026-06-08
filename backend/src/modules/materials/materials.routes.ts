import { Router } from "express";
import { z } from "zod";
import { authenticateInternal } from "../../middlewares/auth.middleware";
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
adminMaterialsRouter.post("/", validate(materialSchema), materialsController.create);
adminMaterialsRouter.put("/:id", validate(materialSchema), materialsController.update);
adminMaterialsRouter.patch("/:id/deactivate", materialsController.deactivate);
adminMaterialsRouter.patch("/:id/activate", materialsController.activate);

materialCategoriesRouter.get("/", materialsController.listCategoriesPublic);

adminMaterialCategoriesRouter.use(authenticateInternal);
adminMaterialCategoriesRouter.get("/", materialsController.listCategoriesAdmin);
adminMaterialCategoriesRouter.post("/", validate(categorySchema), materialsController.createCategory);
adminMaterialCategoriesRouter.put("/:id", validate(categorySchema), materialsController.updateCategory);
adminMaterialCategoriesRouter.patch("/:id/deactivate", materialsController.deactivateCategory);
