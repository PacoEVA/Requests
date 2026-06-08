import { apiRequest } from "./api";
import type { AuthUser, LoginResponse } from "../types/auth.types";

export const authService = {
  login(username: string, password: string) {
    return apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
  },
  me(token: string) {
    return apiRequest<{ user: AuthUser }>("/auth/me", { token });
  },
  changePassword(token: string, currentPassword: string, newPassword: string) {
    return apiRequest<{ ok: boolean }>("/auth/change-password", {
      method: "POST",
      token,
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },
  forceChangePassword(token: string, newPassword: string) {
    return apiRequest<{ ok: boolean }>("/auth/force-change-password", {
      method: "POST",
      token,
      body: JSON.stringify({ newPassword })
    });
  }
};
