import type { RequestHandler } from "express";
import { AppError } from "../../middlewares/error.middleware";
import { requisitionsService } from "./requisitions.service";

/** Valida y convierte parametros id de requisicion. */
function numericId(value: string | undefined) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0)
    throw new AppError("Id inválido", 400, "INVALID_ID");
  return id;
}

export class RequisitionsController {
  /** Crea una requisicion desde la identidad del empleado. */
  create: RequestHandler = async (req, res, next) => {
    try {
      if (!req.employee)
        throw new AppError(
          "Empleado no identificado",
          401,
          "EMPLOYEE_REQUIRED",
        );
      const requisition = await requisitionsService.create(
        req.employee,
        req.body,
      );
      res.status(201).json({ requisition });
    } catch (error) {
      next(error);
    }
  };

  /** Lista requisiciones propias del empleado autenticado. */
  listMine: RequestHandler = async (req, res, next) => {
    try {
      if (!req.employee)
        throw new AppError(
          "Empleado no identificado",
          401,
          "EMPLOYEE_REQUIRED",
        );
      const requisitions = await requisitionsService.listMine(
        req.employee,
        req.query,
      );
      res.json({ requisitions });
    } catch (error) {
      next(error);
    }
  };

  /** Devuelve el detalle de una requisicion del empleado autenticado. */
  getMine: RequestHandler = async (req, res, next) => {
    try {
      if (!req.employee)
        throw new AppError(
          "Empleado no identificado",
          401,
          "EMPLOYEE_REQUIRED",
        );
      const requisition = await requisitionsService.getMine(
        req.employee,
        numericId(req.params.id),
      );
      res.json({ requisition });
    } catch (error) {
      next(error);
    }
  };

  /** Cancela una requisicion propia indicando motivo. */
  cancelMine: RequestHandler = async (req, res, next) => {
    try {
      if (!req.employee)
        throw new AppError(
          "Empleado no identificado",
          401,
          "EMPLOYEE_REQUIRED",
        );
      const requisition = await requisitionsService.cancelMine(
        req.employee,
        numericId(req.params.id),
        req.body.reason,
      );
      res.json({ ok: true, requisition });
    } catch (error) {
      next(error);
    }
  };

  /** Lista requisiciones visibles para el usuario interno. */
  listAdmin: RequestHandler = async (req, res, next) => {
    try {
      if (!req.user)
        throw new AppError("Usuario no autenticado", 401, "AUTH_REQUIRED");
      const requisitions = await requisitionsService.listAdmin(
        req.user,
        req.query,
      );
      res.json({ requisitions });
    } catch (error) {
      next(error);
    }
  };

  /** Devuelve detalle de requisicion para administracion. */
  getAdmin: RequestHandler = async (req, res, next) => {
    try {
      if (!req.user)
        throw new AppError("Usuario no autenticado", 401, "AUTH_REQUIRED");
      const requisition = await requisitionsService.getAdmin(
        req.user,
        numericId(req.params.id),
      );
      res.json({ requisition });
    } catch (error) {
      next(error);
    }
  };

  /** Cambia estado y cantidades aprobadas segun reglas de negocio. */
  updateStatus: RequestHandler = async (req, res, next) => {
    try {
      if (!req.user)
        throw new AppError("Usuario no autenticado", 401, "AUTH_REQUIRED");

      const requisition = await requisitionsService.updateStatus(
        req.user,
        numericId(req.params.id),
        req.body,
      );

      res.json({ ok: true, requisition });
    } catch (error) {
      next(error);
    }
  };

  /** Asigna una requisicion a un usuario interno responsable. */
  assign: RequestHandler = async (req, res, next) => {
    try {
      if (!req.user)
        throw new AppError("Usuario no autenticado", 401, "AUTH_REQUIRED");
      const requisition = await requisitionsService.assign(
        req.user,
        numericId(req.params.id),
        req.body.assignedToUserId,
        req.body.comment,
      );
      res.json({ ok: true, requisition });
    } catch (error) {
      next(error);
    }
  };

  /** Registra entregas parciales o totales de lineas aprobadas. */
  deliver: RequestHandler = async (req, res, next) => {
    try {
      if (!req.user)
        throw new AppError("Usuario no autenticado", 401, "AUTH_REQUIRED");
      const requisition = await requisitionsService.deliver(
        req.user,
        numericId(req.params.id),
        req.body,
      );
      res.json({ ok: true, requisition });
    } catch (error) {
      next(error);
    }
  };

  /** Lista comentarios de una requisicion para empleado o usuario interno. */
  listComments: RequestHandler = async (req, res, next) => {
    try {
      const requisitionId = numericId(req.params.id);
      const comments = req.employee
        ? await requisitionsService.listCommentsForEmployee(
            req.employee,
            requisitionId,
          )
        : req.user
          ? await requisitionsService.listCommentsForAdmin(
              req.user,
              requisitionId,
            )
          : null;

      if (!comments)
        throw new AppError("Autenticacion requerida", 401, "AUTH_REQUIRED");
      res.json({ comments });
    } catch (error) {
      next(error);
    }
  };

  /** Agrega comentario como empleado o usuario interno. */
  addComment: RequestHandler = async (req, res, next) => {
    try {
      const requisitionId = numericId(req.params.id);
      const comment = req.employee
        ? await requisitionsService.addEmployeeComment(
            req.employee,
            requisitionId,
            req.body.message,
          )
        : req.user
          ? await requisitionsService.addInternalComment(
              req.user,
              requisitionId,
              req.body.message,
            )
          : null;

      if (!comment)
        throw new AppError("Autenticación requerida", 401, "AUTH_REQUIRED");
      res.status(201).json({ comment });
    } catch (error) {
      next(error);
    }
  };
}

export const requisitionsController = new RequisitionsController();
