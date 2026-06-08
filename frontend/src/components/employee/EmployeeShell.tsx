import { ClipboardList, FilePlus2, Home, UserRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useEmployee } from "../../contexts/EmployeeContext";

export function EmployeeShell() {
  const { employee } = useEmployee();

  return (
    <div className="app-shell employee-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <strong>Requests</strong>
          <span>{employee?.departmentName ?? "Empleado"}</span>
        </div>
        <nav className="nav-list" aria-label="Empleado">
          <NavLink to="/employee">
            <Home size={18} /> Inicio
          </NavLink>
          <NavLink to="/employee/requisitions/new">
            <FilePlus2 size={18} /> Nueva
          </NavLink>
          <NavLink to="/employee/requisitions">
            <ClipboardList size={18} /> Mis solicitudes
          </NavLink>
          <NavLink to="/employee/profile">
            <UserRound size={18} /> Perfil
          </NavLink>
        </nav>
      </aside>
      <main className="workspace">
        <Outlet />
      </main>
    </div>
  );
}
