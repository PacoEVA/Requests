import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";
import { AppError } from "../../middlewares/error.middleware";
import { hashPassword, verifyPassword } from "../../utils/password";
import { authRepository } from "./auth.repository";
import type { AuthenticatedUser, InternalUserRecord, LoginResponse } from "./auth.types";

function toTokenUser(user: InternalUserRecord): AuthenticatedUser {
  return {
    sub: user.id,
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    requirePasswordChange: user.requirePasswordChange
  };
}

export class AuthService {
  async login(username: string, password: string): Promise<LoginResponse> {
    const user = await authRepository.findByUsername(username);

    if (!user || !user.isActive) {
      throw new AppError("Credenciales inválidas", 401, "INVALID_CREDENTIALS");
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      throw new AppError("Credenciales inválidas", 401, "INVALID_CREDENTIALS");
    }

    await authRepository.updateLastLogin(user.id);

    const payload = toTokenUser(user);
    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
    });

    return {
      token,
      user: {
        id: payload.id,
        username: payload.username,
        fullName: payload.fullName,
        role: payload.role,
        requirePasswordChange: payload.requirePasswordChange
      }
    };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw new AppError("Usuario no encontrado", 404, "USER_NOT_FOUND");
    }

    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      throw new AppError("Contraseña actual inválida", 400, "INVALID_CURRENT_PASSWORD");
    }

    await authRepository.updatePassword(user.id, await hashPassword(newPassword), false);
  }

  async forceChangePassword(userId: number, newPassword: string) {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw new AppError("Usuario no encontrado", 404, "USER_NOT_FOUND");
    }

    await authRepository.updatePassword(user.id, await hashPassword(newPassword), false);
  }
}

export const authService = new AuthService();
