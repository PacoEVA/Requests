import { Router } from "express";
import { z } from "zod";
import { authenticateEmployee } from "../../middlewares/employee.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { employeesController } from "./employees.controller";

const identifySchema = z.object({
  name: z.string().min(2).max(150),
  departmentId: z.number().int().positive(),
  employeeCode: z.string().max(50).optional(),
  phoneOrExtension: z.string().max(50).optional()
});

const updateEmployeeSchema = identifySchema.omit({ employeeCode: true });

export const employeesRouter = Router();

employeesRouter.post("/identify", validate(identifySchema), employeesController.identify);
employeesRouter.get("/me", authenticateEmployee, employeesController.me);
employeesRouter.put("/me", authenticateEmployee, validate(updateEmployeeSchema), employeesController.updateMe);
