export type RoleName = "Admin" | "Compras" | "Supervisor";

export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  role: RoleName;
  departmentId?: number | null;
  requirePasswordChange: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
