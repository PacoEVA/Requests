import type { RequestHandler } from "express";
import { AppError } from "../../middlewares/error.middleware";
import { employeesService } from "./employees.service";

/** Valida y convierte ids recibidos por rutas administrativas. */
function numericId(value: string | undefined) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError("Id inválido", 400, "INVALID_ID");
  return id;
}

export class EmployeesController {
  /** Lista cuentas de empleados para la administracion. */
  adminList: RequestHandler = async (_req, res, next) => {
    try {
      res.json({ employees: await employeesService.listForAdmin() });
    } catch (error) {
      next(error);
    }
  };

  /** Habilita una cuenta de empleado. */
  adminActivate: RequestHandler = async (req, res, next) => {
    try {
      await employeesService.setActive(numericId(req.params.id), true);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  /** Inhabilita una cuenta de empleado y corta su acceso vigente. */
  adminDeactivate: RequestHandler = async (req, res, next) => {
    try {
      await employeesService.setActive(numericId(req.params.id), false);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  /** Registra un empleado y devuelve una sesion autenticada. */
  register: RequestHandler = async (req, res, next) => {
    try {
      res.status(201).json(await employeesService.register(req.body));
    } catch (error) {
      next(error);
    }
  };

  /** Inicia sesion con usuario y contrasena. */
  login: RequestHandler = async (req, res, next) => {
    try {
      res.json(await employeesService.login(req.body));
    } catch (error) {
      next(error);
    }
  };

  /** Devuelve el empleado autenticado por su JWT de sesion. */
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
      if (!req.employee) throw new AppError("Sesión de empleado requerida", 401, "EMPLOYEE_REQUIRED");
      const employee = await employeesService.update(req.employee.id, req.body);
      res.json({ employee });
    } catch (error) {
      next(error);
    }
  };
}

export const employeesController = new EmployeesController();
