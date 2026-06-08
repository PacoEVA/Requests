import type { RequestHandler } from "express";
import { AppError } from "../../middlewares/error.middleware";
import { requisitionsService } from "./requisitions.service";

function numericId(value: string | undefined) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError("Id inválido", 400, "INVALID_ID");
  return id;
}

export class RequisitionsController {
  create: RequestHandler = async (req, res, next) => {
    try {
      if (!req.employee) throw new AppError("Empleado no identificado", 401, "EMPLOYEE_REQUIRED");
      const requisition = await requisitionsService.create(req.employee, req.body);
      res.status(201).json({ requisition });
    } catch (error) {
      next(error);
    }
  };

  listMine: RequestHandler = async (req, res, next) => {
    try {
      if (!req.employee) throw new AppError("Empleado no identificado", 401, "EMPLOYEE_REQUIRED");
      const requisitions = await requisitionsService.listMine(req.employee, req.query);
      res.json({ requisitions });
    } catch (error) {
      next(error);
    }
  };

  getMine: RequestHandler = async (req, res, next) => {
    try {
      if (!req.employee) throw new AppError("Empleado no identificado", 401, "EMPLOYEE_REQUIRED");
      const requisition = await requisitionsService.getMine(req.employee, numericId(req.params.id));
      res.json({ requisition });
    } catch (error) {
      next(error);
    }
  };

  cancelMine: RequestHandler = async (req, res, next) => {
    try {
      if (!req.employee) throw new AppError("Empleado no identificado", 401, "EMPLOYEE_REQUIRED");
      await requisitionsService.cancelMine(req.employee, numericId(req.params.id), req.body.reason);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  listAdmin: RequestHandler = async (req, res, next) => {
    try {
      const requisitions = await requisitionsService.listAdmin(req.query);
      res.json({ requisitions });
    } catch (error) {
      next(error);
    }
  };

  getAdmin: RequestHandler = async (req, res, next) => {
    try {
      const requisition = await requisitionsService.getAdmin(numericId(req.params.id));
      res.json({ requisition });
    } catch (error) {
      next(error);
    }
  };

  updateStatus: RequestHandler = async (req, res, next) => {
    try {
      if (!req.user) throw new AppError("Usuario no autenticado", 401, "AUTH_REQUIRED");
      await requisitionsService.updateStatus(req.user, numericId(req.params.id), req.body);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  assign: RequestHandler = async (req, res, next) => {
    try {
      if (!req.user) throw new AppError("Usuario no autenticado", 401, "AUTH_REQUIRED");
      await requisitionsService.assign(req.user, numericId(req.params.id), req.body.assignedToUserId);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  deliver: RequestHandler = async (req, res, next) => {
    try {
      if (!req.user) throw new AppError("Usuario no autenticado", 401, "AUTH_REQUIRED");
      await requisitionsService.deliver(req.user, numericId(req.params.id), req.body);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  listComments: RequestHandler = async (req, res, next) => {
    try {
      const comments = await requisitionsService.listComments(numericId(req.params.id));
      res.json({ comments });
    } catch (error) {
      next(error);
    }
  };

  addComment: RequestHandler = async (req, res, next) => {
    try {
      const requisitionId = numericId(req.params.id);
      const comment = req.employee
        ? await requisitionsService.addEmployeeComment(req.employee, requisitionId, req.body.message)
        : req.user
          ? await requisitionsService.addInternalComment(req.user, requisitionId, req.body.message)
          : null;

      if (!comment) throw new AppError("Autenticación requerida", 401, "AUTH_REQUIRED");
      res.status(201).json({ comment });
    } catch (error) {
      next(error);
    }
  };
}

export const requisitionsController = new RequisitionsController();
