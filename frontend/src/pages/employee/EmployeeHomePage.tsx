import { ClipboardList, FilePlus2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { useEmployee } from "../../contexts/EmployeeContext";
import { requisitionService } from "../../services/requisition.service";
import type { RequisitionSummary } from "../../types/requisition.types";
import { recordValue } from "../../utils/record";

export function EmployeeHomePage() {
  const { employee, employeeToken } = useEmployee();
  const [recent, setRecent] = useState<RequisitionSummary[]>([]);

  useEffect(() => {
    if (!employeeToken) return;
    requisitionService
      .my(employeeToken, { pageSize: 5 })
      .then((response) => setRecent(response.requisitions))
      .catch(() => setRecent([]));
  }, [employeeToken]);

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
      <section className="surface">
        <h2>Ultimas requisiciones</h2>
        <div className="data-table compact-table">
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Estado</th>
                <th>Prioridad</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((item) => {
                const record = item as Record<string, unknown>;
                const id = recordValue<number>(record, "id", "Id", 0);
                return (
                  <tr key={id}>
                    <td>
                      <Link to={`/employee/requisitions/${id}`}>{recordValue<string>(record, "code", "Code", "")}</Link>
                    </td>
                    <td>{recordValue<string>(record, "statusName", "StatusName", "")}</td>
                    <td>{recordValue<string>(record, "priority", "Priority", "Media")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
