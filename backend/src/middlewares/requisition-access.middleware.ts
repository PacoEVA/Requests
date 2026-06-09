import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { employeesService } from "../modules/employees/employees.service";
import type { AuthenticatedUser } from "../modules/auth/auth.types";
import { AppError } from "./error.middleware";

export const authenticateEmployeeOrInternal: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (token) {
    try {
      req.user = jwt.verify(token, env.JWT_SECRET) as unknown as AuthenticatedUser;
      next();
      return;
    } catch {
      next(new AppError("Token invalido", 401, "INVALID_TOKEN"));
      return;
    }
  }

  const employeeToken = req.header("x-employee-token");
  if (employeeToken) {
    try {
      req.employee = await employeesService.getSessionByToken(employeeToken);
      next();
      return;
    } catch {
      next(new AppError("Empleado no identificado", 401, "INVALID_EMPLOYEE_TOKEN"));
      return;
    }
  }

  next(new AppError("Autenticacion requerida", 401, "AUTH_REQUIRED"));
};
