import type { RequestHandler } from "express";
import { AppError } from "../../middlewares/error.middleware";
import { materialsService } from "./materials.service";

/** Valida y convierte parametros id de material. */
function numericId(value: string | undefined) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError("Id invalido", 400, "INVALID_ID");
  return id;
}

export class MaterialsController {
  /** Lista materiales activos y solicitables para empleados. */
  listPublic: RequestHandler = async (req, res, next) => {
    try {
      res.json({ materials: await materialsService.listPublic(String(req.query.search ?? "")) });
    } catch (error) {
      next(error);
    }
  };

  /** Lista materiales para administracion, incluyendo inactivos/no solicitables. */
  listAdmin: RequestHandler = async (req, res, next) => {
    try {
      res.json({ materials: await materialsService.listAdmin(String(req.query.search ?? "")) });
    } catch (error) {
      next(error);
    }
  };

  /** Crea un material de catalogo. */
  create: RequestHandler = async (req, res, next) => {
    try {
      res.status(201).json({ material: await materialsService.create(req.body) });
    } catch (error) {
      next(error);
    }
  };

  /** Actualiza los datos editables de un material. */
  update: RequestHandler = async (req, res, next) => {
    try {
      res.json({ material: await materialsService.update(numericId(req.params.id), req.body) });
    } catch (error) {
      next(error);
    }
  };

  /** Desactiva un material sin eliminarlo del historial. */
  deactivate: RequestHandler = async (req, res, next) => {
    try {
      await materialsService.setActive(numericId(req.params.id), false);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  /** Reactiva un material previamente desactivado. */
  activate: RequestHandler = async (req, res, next) => {
    try {
      await materialsService.setActive(numericId(req.params.id), true);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };
}

export const materialsController = new MaterialsController();
