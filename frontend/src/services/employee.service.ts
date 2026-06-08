import { apiRequest } from "./api";
import type { Department, Employee } from "../types/employee.types";

export interface IdentifyEmployeePayload {
  name: string;
  departmentId: number;
  employeeCode?: string;
  phoneOrExtension?: string;
}

export const employeeService = {
  identify(payload: IdentifyEmployeePayload) {
    return apiRequest<{ employee: Employee; publicToken: string }>("/employees/identify", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  me(employeeToken: string) {
    return apiRequest<{ employee: Employee }>("/employees/me", { employeeToken });
  },
  update(employeeToken: string, payload: Omit<IdentifyEmployeePayload, "employeeCode">) {
    return apiRequest<{ employee: Employee }>("/employees/me", {
      method: "PUT",
      employeeToken,
      body: JSON.stringify(payload)
    });
  },
  departments() {
    return apiRequest<{ departments: Department[] }>("/departments");
  }
};
