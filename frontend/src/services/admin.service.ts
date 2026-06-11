import { apiRequest } from "./api";
import type { Department } from "../types/employee.types";

export const adminService = {
  departments(token: string) {
    return apiRequest<{ departments: Department[] }>("/admin/departments", { token });
  },
  createDepartment(token: string, payload: { name: string; description?: string }) {
    return apiRequest<{ department: Department }>("/admin/departments", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    });
  },
  updateDepartment(token: string, id: number, payload: { name: string; description?: string }) {
    return apiRequest<{ department: Department }>(`/admin/departments/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    });
  },
  setDepartmentActive(token: string, id: number, isActive: boolean) {
    return apiRequest<{ ok: boolean }>(`/admin/departments/${id}/${isActive ? "activate" : "deactivate"}`, {
      method: "PATCH",
      token
    });
  },
  users(token: string) {
    return apiRequest<{ users: unknown[] }>("/admin/users", { token });
  },
  createUser(
    token: string,
    payload: { username: string; fullName: string; password: string; role: string; departmentId?: number }
  ) {
    return apiRequest<{ user: unknown }>("/admin/users", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    });
  },
  resetPassword(token: string, userId: number) {
    return apiRequest<{ temporaryPassword: string; requirePasswordChange: boolean }>(`/admin/users/${userId}/reset-password`, {
      method: "POST",
      token,
      body: JSON.stringify({ autoGenerate: true })
    });
  },
  updateUser(
    token: string,
    id: number,
    payload: { username: string; fullName: string; role: string; departmentId?: number }
  ) {
    return apiRequest<{ user: unknown }>(`/admin/users/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    });
  },
  setUserActive(token: string, userId: number, isActive: boolean) {
    return apiRequest<{ ok: boolean }>(`/admin/users/${userId}/${isActive ? "activate" : "deactivate"}`, {
      method: "PATCH",
      token
    });
  }
};
