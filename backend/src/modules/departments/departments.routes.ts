import { Router } from "express";
import { z } from "zod";
import { authenticateInternal } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { departmentsController } from "./departments.controller";

const departmentSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(300).optional()
});

export const departmentsRouter = Router();
export const adminDepartmentsRouter = Router();

departmentsRouter.get("/", departmentsController.listPublic);

adminDepartmentsRouter.use(authenticateInternal);
adminDepartmentsRouter.get("/", departmentsController.listAdmin);
adminDepartmentsRouter.post("/", validate(departmentSchema), departmentsController.create);
adminDepartmentsRouter.put("/:id", validate(departmentSchema), departmentsController.update);
adminDepartmentsRouter.patch("/:id/deactivate", departmentsController.deactivate);
adminDepartmentsRouter.patch("/:id/activate", departmentsController.activate);
