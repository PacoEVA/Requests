import { apiRequest } from "./api";
import type { Department, Employee } from "../types/employee.types";

export interface RegisterEmployeePayload {
  name: string;
  departmentId: number;
  employeeCode: string;
  phoneOrExtension: string;
  email: string;
  username: string;
  password: string;
}

export interface LoginEmployeePayload {
  username: string;
  password: string;
}

export type UpdateEmployeePayload = Pick<
  RegisterEmployeePayload,
  "name" | "departmentId" | "phoneOrExtension" | "email"
>;

export const employeeService = {
  /** Registra un empleado y devuelve su JWT de sesion. */
  register(payload: RegisterEmployeePayload) {
    return apiRequest<{ employee: Employee; token: string }>("/employees/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  /** Inicia sesion con usuario y contrasena. */
  login(payload: LoginEmployeePayload) {
    return apiRequest<{ employee: Employee; token: string }>("/employees/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  /** Obtiene el perfil asociado al JWT de empleado. */
  me(employeeToken: string) {
    return apiRequest<{ employee: Employee }>("/employees/me", { employeeToken });
  },
  /** Actualiza el perfil editable del empleado. */
  update(employeeToken: string, payload: UpdateEmployeePayload) {
    return apiRequest<{ employee: Employee }>("/employees/me", {
      method: "PUT",
      employeeToken,
      body: JSON.stringify(payload)
    });
  },
  /** Lista departamentos activos para identificacion de empleado. */
  departments() {
    return apiRequest<{ departments: Department[] }>("/departments");
  }
};
