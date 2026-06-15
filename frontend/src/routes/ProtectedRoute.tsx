import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useEmployee } from "../contexts/EmployeeContext";
import type { RoleName } from "../types/auth.types";

/** Protege rutas administrativas que requieren token interno valido. */
export function AdminProtectedRoute() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (user?.requirePasswordChange) {
    return <Navigate to="/admin/change-password-required" replace />;
  }

  return <Outlet />;
}

/** Protege subrutas administrativas por rol. */
export function AdminRoleRoute({ roles }: { roles: RoleName[] }) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
}

/** Protege rutas de empleado que requieren token publico identificado. */
export function EmployeeProtectedRoute() {
  const { employeeToken } = useEmployee();
  const location = useLocation();

  if (!employeeToken) {
    return <Navigate to="/employee/identify" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
