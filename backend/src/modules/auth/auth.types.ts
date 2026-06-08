export type RoleName = "Admin" | "Compras" | "Supervisor";

export interface AuthenticatedUser {
  sub: number;
  id: number;
  username: string;
  fullName: string;
  role: RoleName;
  requirePasswordChange: boolean;
}

export interface InternalUserRecord {
  id: number;
  username: string;
  fullName: string;
  passwordHash: string;
  role: RoleName;
  isActive: boolean;
  requirePasswordChange: boolean;
}

export interface LoginResponse {
  token: string;
  user: Omit<AuthenticatedUser, "sub">;
}
