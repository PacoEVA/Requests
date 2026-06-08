import type { RequestHandler } from "express";
import { AppError } from "../../middlewares/error.middleware";
import { usersService } from "./users.service";

function numericId(value: string | undefined) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError("Id inválido", 400, "INVALID_ID");
  return id;
}

export class UsersController {
  list: RequestHandler = async (_req, res, next) => {
    try {
      res.json({ users: await usersService.list() });
    } catch (error) {
      next(error);
    }
  };

  create: RequestHandler = async (req, res, next) => {
    try {
      res.status(201).json({ user: await usersService.create(req.body) });
    } catch (error) {
      next(error);
    }
  };

  update: RequestHandler = async (req, res, next) => {
    try {
      res.json({ user: await usersService.update(numericId(req.params.id), req.body) });
    } catch (error) {
      next(error);
    }
  };

  deactivate: RequestHandler = async (req, res, next) => {
    try {
      await usersService.setActive(numericId(req.params.id), false);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  activate: RequestHandler = async (req, res, next) => {
    try {
      await usersService.setActive(numericId(req.params.id), true);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  resetPassword: RequestHandler = async (req, res, next) => {
    try {
      res.json(await usersService.resetPassword(numericId(req.params.id), req.body));
    } catch (error) {
      next(error);
    }
  };
}

export const usersController = new UsersController();
