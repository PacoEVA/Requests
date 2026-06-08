import { ClipboardList, FilePlus2, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { useEmployee } from "../../contexts/EmployeeContext";

export function EmployeeHomePage() {
  const { employee } = useEmployee();

  return (
    <>
      <PageHeader title={`Hola, ${employee?.name ?? "empleado"}`} eyebrow="Portal del empleado" />
      <section className="action-grid">
        <Link className="action-tile" to="/employee/requisitions/new">
          <FilePlus2 />
          <span>Nueva requisición</span>
          <small>Solicita material gastable con líneas de catálogo o manuales.</small>
        </Link>
        <Link className="action-tile" to="/employee/requisitions">
          <ClipboardList />
          <span>Mis requisiciones</span>
          <small>Consulta estados, historial y comentarios en tiempo real.</small>
        </Link>
        <Link className="action-tile" to="/employee/profile">
          <UserRound />
          <span>Perfil</span>
          <small>Actualiza departamento, teléfono o cambia la identidad del navegador.</small>
        </Link>
      </section>
    </>
  );
}
