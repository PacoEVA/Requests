export interface EmployeeSession {
  id: number;
  publicToken: string;
  name: string;
  departmentId: number;
  departmentName?: string;
  employeeCode?: string | null;
  phoneOrExtension?: string | null;
}

export interface IdentifyEmployeeInput {
  name: string;
  departmentId: number;
  employeeCode?: string;
  phoneOrExtension?: string;
}

export type UpdateEmployeeInput = Omit<IdentifyEmployeeInput, "employeeCode">;
