import {
  BarChart3,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Package,
  Users,
  Workflow
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-shell admin-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-title">
            <span className="brand-mark">R</span>
            <div>
              <strong>Compras</strong>
              <span>{user?.fullName}</span>
            </div>
          </div>
        </div>
        <nav className="nav-list" aria-label="Administración">
          <span className="nav-section">Operación</span>
          <NavLink to="/admin/dashboard">
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink to="/admin/requisitions">
            <ClipboardList size={18} /> Requisiciones
          </NavLink>
          <NavLink to="/admin/materials">
            <Package size={18} /> Materiales
          </NavLink>
          <NavLink to="/admin/departments">
            <Workflow size={18} /> Departamentos
          </NavLink>
          <span className="nav-section">Administración</span>
          <NavLink to="/admin/users">
            <Users size={18} /> Usuarios
          </NavLink>
          <NavLink to="/admin/reports">
            <FileBarChart size={18} /> Reportes
          </NavLink>
          <NavLink to="/admin/dashboard">
            <BarChart3 size={18} /> Estadísticas
          </NavLink>
        </nav>
        <button
          className="icon-text-button subtle"
          type="button"
          onClick={() => {
            logout();
            navigate("/admin/login");
          }}
        >
          <LogOut size={18} /> Salir
        </button>
      </aside>
      <main className="workspace">
        <Outlet />
      </main>
    </div>
  );
}
