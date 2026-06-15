import type { RequestHandler } from "express";
import { AppError } from "../../middlewares/error.middleware";
import { usersService } from "./users.service";

/** Valida y convierte parametros id de usuario interno. */
function numericId(value: string | undefined) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError("Id inválido", 400, "INVALID_ID");
  return id;
}

export class UsersController {
  /** Lista usuarios internos con rol, departamento y estado. */
  list: RequestHandler = async (_req, res, next) => {
    try {
      res.json({ users: await usersService.list() });
    } catch (error) {
      next(error);
    }
  };

  /** Crea un usuario interno con contrasena inicial. */
  create: RequestHandler = async (req, res, next) => {
    try {
      res.status(201).json({ user: await usersService.create(req.body) });
    } catch (error) {
      next(error);
    }
  };

  /** Actualiza datos, rol y departamento de un usuario interno. */
  update: RequestHandler = async (req, res, next) => {
    try {
      res.json({ user: await usersService.update(numericId(req.params.id), req.body) });
    } catch (error) {
      next(error);
    }
  };

  /** Desactiva un usuario interno. */
  deactivate: RequestHandler = async (req, res, next) => {
    try {
      await usersService.setActive(numericId(req.params.id), false);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  /** Reactiva un usuario interno. */
  activate: RequestHandler = async (req, res, next) => {
    try {
      await usersService.setActive(numericId(req.params.id), true);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  /** Restablece contrasena manual o autogenerada y fuerza cambio posterior. */
  resetPassword: RequestHandler = async (req, res, next) => {
    try {
      res.json(await usersService.resetPassword(numericId(req.params.id), req.body));
    } catch (error) {
      next(error);
    }
  };
}

export const usersController = new UsersController();
