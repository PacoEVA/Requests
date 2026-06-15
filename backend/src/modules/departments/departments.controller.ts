import type { RequestHandler } from "express";
import { AppError } from "../../middlewares/error.middleware";
import { departmentsService } from "./departments.service";

/** Valida y convierte parametros id de departamento. */
function numericId(value: string | undefined) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError("Id inválido", 400, "INVALID_ID");
  return id;
}

export class DepartmentsController {
  /** Lista departamentos activos para formularios publicos de empleados. */
  listPublic: RequestHandler = async (_req, res, next) => {
    try {
      res.json({ departments: await departmentsService.list(true) });
    } catch (error) {
      next(error);
    }
  };

  /** Lista todos los departamentos para administracion. */
  listAdmin: RequestHandler = async (_req, res, next) => {
    try {
      res.json({ departments: await departmentsService.list(false) });
    } catch (error) {
      next(error);
    }
  };

  /** Crea un departamento administrativo. */
  create: RequestHandler = async (req, res, next) => {
    try {
      res.status(201).json({ department: await departmentsService.create(req.body) });
    } catch (error) {
      next(error);
    }
  };

  /** Actualiza nombre y descripcion de un departamento. */
  update: RequestHandler = async (req, res, next) => {
    try {
      res.json({ department: await departmentsService.update(numericId(req.params.id), req.body) });
    } catch (error) {
      next(error);
    }
  };

  /** Desactiva un departamento sin eliminar su historial. */
  deactivate: RequestHandler = async (req, res, next) => {
    try {
      await departmentsService.setActive(numericId(req.params.id), false);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  /** Reactiva un departamento previamente desactivado. */
  activate: RequestHandler = async (req, res, next) => {
    try {
      await departmentsService.setActive(numericId(req.params.id), true);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };
}

export const departmentsController = new DepartmentsController();
