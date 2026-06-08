import type { RequestHandler } from "express";
import { employeesService } from "../modules/employees/employees.service";
import { AppError } from "./error.middleware";

export const authenticateEmployee: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.header("x-employee-token");

    if (!token) {
      next(new AppError("Identidad de empleado requerida", 401, "EMPLOYEE_REQUIRED"));
      return;
    }

    req.employee = await employeesService.getSessionByToken(token);
    next();
  } catch (error) {
    next(error);
  }
};
