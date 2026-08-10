export interface EmployeeSession {
  id: number;
  username: string;
  name: string;
  departmentId: number;
  departmentName?: string;
  employeeCode?: string | null;
  phoneOrExtension?: string | null;
  email?: string | null;
}

export interface EmployeeAuthRecord extends EmployeeSession {
  passwordHash: string;
  isActive: boolean;
}

export interface RegisterEmployeeInput {
  name: string;
  departmentId: number;
  employeeCode: string;
  phoneOrExtension: string;
  email: string;
  username: string;
  password: string;
}

export interface LoginEmployeeInput {
  username: string;
  password: string;
}

export interface UpdateEmployeeInput {
  name: string;
  departmentId: number;
  phoneOrExtension: string;
  email: string;
}

export interface EmployeeAuthResponse {
  token: string;
  employee: EmployeeSession;
}

export interface EmployeeIdentityConflicts {
  employeeCode: boolean;
  email: boolean;
  username: boolean;
}
