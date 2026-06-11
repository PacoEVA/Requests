import { Navigate, Route, Routes } from "react-router-dom";
import { AdminShell } from "../components/admin/AdminShell";
import { EmployeeShell } from "../components/employee/EmployeeShell";
import { AdminProtectedRoute, AdminRoleRoute, EmployeeProtectedRoute } from "./ProtectedRoute";
import { CreateRequisitionPage } from "../pages/employee/CreateRequisitionPage";
import { EmployeeHomePage } from "../pages/employee/EmployeeHomePage";
import { EmployeeIdentifyPage } from "../pages/employee/EmployeeIdentifyPage";
import { EmployeeProfilePage } from "../pages/employee/EmployeeProfilePage";
import { EmployeeRequisitionDetailPage } from "../pages/employee/EmployeeRequisitionDetailPage";
import { MyRequisitionsPage } from "../pages/employee/MyRequisitionsPage";
import { DashboardPage } from "../pages/admin/DashboardPage";
import { DepartmentsPage } from "../pages/admin/DepartmentsPage";
import { ForceChangePasswordPage } from "../pages/admin/ForceChangePasswordPage";
import { LoginPage } from "../pages/admin/LoginPage";
import { MaterialsPage } from "../pages/admin/MaterialsPage";
import { ReportsPage } from "../pages/admin/ReportsPage";
import { RequisitionDetailPage } from "../pages/admin/RequisitionDetailPage";
import { RequisitionsPage } from "../pages/admin/RequisitionsPage";
import { UsersPage } from "../pages/admin/UsersPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/employee" replace />} />
      <Route path="/employee/identify" element={<EmployeeIdentifyPage />} />
      <Route element={<EmployeeProtectedRoute />}>
        <Route element={<EmployeeShell />}>
          <Route path="/employee" element={<EmployeeHomePage />} />
          <Route path="/employee/requisitions/new" element={<CreateRequisitionPage />} />
          <Route path="/employee/requisitions" element={<MyRequisitionsPage />} />
          <Route path="/employee/requisitions/:id" element={<EmployeeRequisitionDetailPage />} />
          <Route path="/employee/profile" element={<EmployeeProfilePage />} />
        </Route>
      </Route>
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin/change-password-required" element={<ForceChangePasswordPage />} />
      <Route element={<AdminProtectedRoute />}>
        <Route element={<AdminShell />}>
          <Route path="/admin/dashboard" element={<DashboardPage />} />
          <Route path="/admin/requisitions" element={<RequisitionsPage />} />
          <Route path="/admin/requisitions/:id" element={<RequisitionDetailPage />} />
          <Route element={<AdminRoleRoute roles={["Admin", "Compras"]} />}>
            <Route path="/admin/materials" element={<MaterialsPage />} />
          </Route>
          <Route element={<AdminRoleRoute roles={["Admin"]} />}>
            <Route path="/admin/departments" element={<DepartmentsPage />} />
            <Route path="/admin/users" element={<UsersPage />} />
          </Route>
          <Route path="/admin/reports" element={<ReportsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/employee" replace />} />
    </Routes>
  );
}
