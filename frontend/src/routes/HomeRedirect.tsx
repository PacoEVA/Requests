import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useEmployee } from "../contexts/EmployeeContext";

export function HomeRedirect() {
  const { isAuthenticated, user } = useAuth();
  const { employeeToken } = useEmployee();

  if (isAuthenticated) {
    return <Navigate to={user?.requirePasswordChange ? "/admin/change-password-required" : "/admin/dashboard"} replace />;
  }

  return <Navigate to={employeeToken ? "/employee" : "/employee/identify"} replace />;
}
