import { Router } from "express";
import { z } from "zod";
import { authenticateInternal, requireRole } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { departmentsController } from "./departments.controller";

const departmentSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(300).optional()
});

export const departmentsRouter = Router();
export const adminDepartmentsRouter = Router();

// Listado publico usado por empleados al identificarse.
departmentsRouter.get("/", departmentsController.listPublic);

// Administracion de departamentos restringida a usuarios internos Admin.
adminDepartmentsRouter.use(authenticateInternal);
adminDepartmentsRouter.get("/", departmentsController.listAdmin);
adminDepartmentsRouter.post("/", requireRole("Admin"), validate(departmentSchema), departmentsController.create);
adminDepartmentsRouter.put("/:id", requireRole("Admin"), validate(departmentSchema), departmentsController.update);
adminDepartmentsRouter.patch("/:id/deactivate", requireRole("Admin"), departmentsController.deactivate);
adminDepartmentsRouter.patch("/:id/activate", requireRole("Admin"), departmentsController.activate);
