import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { AuthenticatedUser, RoleName } from "../modules/auth/auth.types";
import { AppError } from "./error.middleware";

export const authenticateInternal: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    next(new AppError("Token requerido", 401, "AUTH_REQUIRED"));
    return;
  }

  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as unknown as AuthenticatedUser;
    next();
  } catch {
    next(new AppError("Token inválido", 401, "INVALID_TOKEN"));
  }
};

export function requireRole(...roles: RoleName[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError("Usuario no autenticado", 401, "AUTH_REQUIRED"));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError("No tiene permiso para esta acción", 403, "FORBIDDEN"));
      return;
    }

    next();
  };
}
