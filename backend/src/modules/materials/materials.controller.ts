import type { RequestHandler } from "express";
import { AppError } from "../../middlewares/error.middleware";
import { materialsService } from "./materials.service";

function numericId(value: string | undefined) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError("Id invalido", 400, "INVALID_ID");
  return id;
}

export class MaterialsController {
  listPublic: RequestHandler = async (req, res, next) => {
    try {
      res.json({ materials: await materialsService.listPublic(String(req.query.search ?? "")) });
    } catch (error) {
      next(error);
    }
  };

  listAdmin: RequestHandler = async (req, res, next) => {
    try {
      res.json({ materials: await materialsService.listAdmin(String(req.query.search ?? "")) });
    } catch (error) {
      next(error);
    }
  };

  create: RequestHandler = async (req, res, next) => {
    try {
      res.status(201).json({ material: await materialsService.create(req.body) });
    } catch (error) {
      next(error);
    }
  };

  update: RequestHandler = async (req, res, next) => {
    try {
      res.json({ material: await materialsService.update(numericId(req.params.id), req.body) });
    } catch (error) {
      next(error);
    }
  };

  deactivate: RequestHandler = async (req, res, next) => {
    try {
      await materialsService.setActive(numericId(req.params.id), false);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

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
