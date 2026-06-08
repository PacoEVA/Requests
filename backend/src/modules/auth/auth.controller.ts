import type { RequestHandler } from "express";
import { AppError } from "../../middlewares/error.middleware";
import { authService } from "./auth.service";

export class AuthController {
  login: RequestHandler = async (req, res, next) => {
    try {
      const response = await authService.login(req.body.username, req.body.password);
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  me: RequestHandler = (req, res, next) => {
    if (!req.user) {
      next(new AppError("Usuario no autenticado", 401, "AUTH_REQUIRED"));
      return;
    }

    res.json({ user: req.user });
  };

  changePassword: RequestHandler = async (req, res, next) => {
    try {
      if (!req.user) throw new AppError("Usuario no autenticado", 401, "AUTH_REQUIRED");
      await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  forceChangePassword: RequestHandler = async (req, res, next) => {
    try {
      if (!req.user) throw new AppError("Usuario no autenticado", 401, "AUTH_REQUIRED");
      await authService.forceChangePassword(req.user.id, req.body.newPassword);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
