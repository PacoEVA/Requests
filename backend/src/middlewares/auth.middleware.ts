import type { RequestHandler } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env";
import { authRepository } from "../modules/auth/auth.repository";
import type { AuthenticatedUser, RoleName } from "../modules/auth/auth.types";
import { AppError } from "./error.middleware";

/** Valida el JWT interno y refresca rol/estado desde DB en cada peticion. */
export const authenticateInternal: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    next(new AppError("Token requerido", 401, "AUTH_REQUIRED"));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload & { kind?: string; id?: number };

    // Se aceptan temporalmente JWT internos antiguos sin kind hasta que expiren.
    if (payload.kind && payload.kind !== "internal") {
      throw new Error("tipo de token incorrecto");
    }

    const id = Number(payload.id);
    if (!Number.isInteger(id) || id <= 0) throw new Error("id invalido");

    const currentUser = await authRepository.findById(id);
    if (!currentUser?.isActive) throw new Error("usuario inactivo");

    req.user = {
      kind: "internal",
      sub: currentUser.id,
      id: currentUser.id,
      username: currentUser.username,
      fullName: currentUser.fullName,
      role: currentUser.role,
      departmentId: currentUser.departmentId,
      requirePasswordChange: currentUser.requirePasswordChange
    } satisfies AuthenticatedUser;
    next();
  } catch {
    next(new AppError("Token inválido o usuario inactivo", 401, "INVALID_TOKEN"));
  }
};

/** Restringe una ruta a usuarios internos con alguno de los roles indicados. */
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
