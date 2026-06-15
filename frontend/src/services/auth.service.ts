import { apiRequest } from "./api";
import type { AuthUser, LoginResponse } from "../types/auth.types";

export const authService = {
  /** Inicia sesion de usuario interno. */
  login(username: string, password: string) {
    return apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
  },
  /** Obtiene la sesion del token interno actual. */
  me(token: string) {
    return apiRequest<{ user: AuthUser }>("/auth/me", { token });
  },
  /** Cambia contrasena validando la actual. */
  changePassword(token: string, currentPassword: string, newPassword: string) {
    return apiRequest<{ ok: boolean }>("/auth/change-password", {
      method: "POST",
      token,
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },
  /** Completa un cambio obligatorio de contrasena. */
  forceChangePassword(token: string, newPassword: string) {
    return apiRequest<{ ok: boolean }>("/auth/force-change-password", {
      method: "POST",
      token,
      body: JSON.stringify({ newPassword })
    });
  }
};
