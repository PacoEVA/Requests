import { apiRequest } from "./api";
import type { Department } from "../types/employee.types";

export const adminService = {
  /** Lista departamentos para pantallas administrativas. */
  departments(token: string) {
    return apiRequest<{ departments: Department[] }>("/admin/departments", { token });
  },
  /** Crea un departamento. */
  createDepartment(token: string, payload: { name: string; description?: string }) {
    return apiRequest<{ department: Department }>("/admin/departments", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    });
  },
  /** Actualiza datos de un departamento. */
  updateDepartment(token: string, id: number, payload: { name: string; description?: string }) {
    return apiRequest<{ department: Department }>(`/admin/departments/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    });
  },
  /** Activa o desactiva un departamento. */
  setDepartmentActive(token: string, id: number, isActive: boolean) {
    return apiRequest<{ ok: boolean }>(`/admin/departments/${id}/${isActive ? "activate" : "deactivate"}`, {
      method: "PATCH",
      token
    });
  },
  /** Lista usuarios internos. */
  users(token: string) {
    return apiRequest<{ users: unknown[] }>("/admin/users", { token });
  },
  /** Crea un usuario interno. */
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
  /** Restablece contrasena de usuario generando una temporal. */
  resetPassword(token: string, userId: number) {
    return apiRequest<{ temporaryPassword: string; requirePasswordChange: boolean }>(`/admin/users/${userId}/reset-password`, {
      method: "POST",
      token,
      body: JSON.stringify({ autoGenerate: true })
    });
  },
  /** Actualiza datos, rol y departamento de usuario interno. */
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
  /** Activa o desactiva un usuario interno. */
  setUserActive(token: string, userId: number, isActive: boolean) {
    return apiRequest<{ ok: boolean }>(`/admin/users/${userId}/${isActive ? "activate" : "deactivate"}`, {
      method: "PATCH",
      token
    });
  },
  /** Lista cuentas de empleados y su estado de acceso. */
  employeeAccounts(token: string) {
    return apiRequest<{ employees: unknown[] }>("/admin/employees", { token });
  },
  /** Habilita o inhabilita el acceso de una cuenta de empleado. */
  setEmployeeActive(token: string, employeeId: number, isActive: boolean) {
    return apiRequest<{ ok: boolean }>(`/admin/employees/${employeeId}/${isActive ? "activate" : "deactivate"}`, {
      method: "PATCH",
      token
    });
  }
};
