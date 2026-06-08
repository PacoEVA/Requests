import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useEmployee } from "../contexts/EmployeeContext";

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

export function EmployeeProtectedRoute() {
  const { employeeToken } = useEmployee();
  const location = useLocation();

  if (!employeeToken) {
    return <Navigate to="/employee/identify" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
