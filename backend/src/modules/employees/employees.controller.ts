import type { RequestHandler } from "express";
import { AppError } from "../../middlewares/error.middleware";
import { employeesService } from "./employees.service";

export class EmployeesController {
  /** Identifica o crea una sesion de empleado y devuelve su token publico. */
  identify: RequestHandler = async (req, res, next) => {
    try {
      const employee = await employeesService.identify(req.body);
      res.status(201).json({ employee, publicToken: employee.publicToken });
    } catch (error) {
      next(error);
    }
  };

  /** Devuelve el empleado autenticado por x-employee-token. */
  me: RequestHandler = (req, res, next) => {
    if (!req.employee) {
      next(new AppError("Empleado no identificado", 401, "EMPLOYEE_REQUIRED"));
      return;
    }

    res.json({ employee: req.employee });
  };

  /** Actualiza los datos editables del empleado autenticado. */
  updateMe: RequestHandler = async (req, res, next) => {
    try {
      const token = req.header("x-employee-token");
      if (!token) throw new AppError("Identidad de empleado requerida", 401, "EMPLOYEE_REQUIRED");
      const employee = await employeesService.update(token, req.body);
      res.json({ employee });
    } catch (error) {
      next(error);
    }
  };
}

export const employeesController = new EmployeesController();
