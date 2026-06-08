import type { AuthenticatedUser } from "../modules/auth/auth.types";
import type { EmployeeSession } from "../modules/employees/employees.types";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      employee?: EmployeeSession;
    }
  }
}

export {};
