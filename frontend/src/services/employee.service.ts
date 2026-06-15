import { apiRequest } from "./api";
import type { Department, Employee } from "../types/employee.types";

export interface IdentifyEmployeePayload {
  name: string;
  departmentId: number;
  employeeCode?: string;
  phoneOrExtension?: string;
}

export const employeeService = {
  /** Identifica o crea la identidad publica de empleado. */
  identify(payload: IdentifyEmployeePayload) {
    return apiRequest<{ employee: Employee; publicToken: string }>("/employees/identify", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  /** Obtiene el perfil del empleado identificado. */
  me(employeeToken: string) {
    return apiRequest<{ employee: Employee }>("/employees/me", { employeeToken });
  },
  /** Actualiza el perfil editable del empleado. */
  update(employeeToken: string, payload: Omit<IdentifyEmployeePayload, "employeeCode">) {
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
