import { Download, FileBarChart, Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { requisitionService } from "../../services/requisition.service";
import type { RequisitionSummary } from "../../types/requisition.types";
import { recordValue } from "../../utils/record";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(rows: RequisitionSummary[]) {
  const headers = ["Codigo", "Empleado", "Departamento", "Fecha", "Prioridad", "Estado", "Responsable"];
  const lines = rows.map((item) => {
    const record = item as Record<string, unknown>;
    return [
      recordValue<string>(record, "code", "Code", ""),
      recordValue<string>(record, "employeeName", "EmployeeName", ""),
      recordValue<string>(record, "departmentName", "DepartmentName", ""),
      recordValue<string>(record, "createdAt", "CreatedAt", ""),
      recordValue<string>(record, "priority", "Priority", ""),
      recordValue<string>(record, "statusName", "StatusName", ""),
      recordValue<string>(record, "assignedToName", "AssignedToName", "")
    ]
      .map(csvEscape)
      .join(",");
  });

  const blob = new Blob([[headers.map(csvEscape).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `requisiciones-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<RequisitionSummary[]>([]);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    status: "",
    employeeSearch: "",
    materialSearch: ""
  });
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    setMessage("");
    const response = await requisitionService.adminList(token, { ...filters, pageSize: 500 });
    setRows(response.requisitions);
    setMessage(`${response.requisitions.length} registros encontrados.`);
  }

  return (
    <>
      <PageHeader title="Reportes" eyebrow="Analisis" />
      <section className="surface dashboard-filter-panel">
        <form className="filter-grid compact-filter" onSubmit={onSubmit}>
          <label>
            Desde
            <input type="date" value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} />
          </label>
          <label>
            Hasta
            <input type="date" value={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} />
          </label>
          <label>
            Estado
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">Todos</option>
              <option value="PENDING">Pendiente</option>
              <option value="APPROVED">Aprobada</option>
              <option value="DELIVERED">Entregada</option>
              <option value="REJECTED">Rechazada</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </label>
          <label>
            Empleado
            <input value={filters.employeeSearch} onChange={(event) => setFilters({ ...filters, employeeSearch: event.target.value })} />
          </label>
          <label>
            Material
            <input value={filters.materialSearch} onChange={(event) => setFilters({ ...filters, materialSearch: event.target.value })} />
          </label>
          <button className="primary-button" type="submit">
            <Search size={18} /> Generar
          </button>
          <button className="secondary-button" type="button" disabled={rows.length === 0} onClick={() => downloadCsv(rows)}>
            <Download size={18} /> Exportar CSV
          </button>
        </form>
        {message ? <p className="form-success">{message}</p> : null}
      </section>

      <section className="surface">
        <h2>
          <FileBarChart size={18} /> Resultado
        </h2>
        <div className="data-table compact-table">
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Empleado</th>
                <th>Departamento</th>
                <th>Fecha</th>
                <th>Prioridad</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const record = item as Record<string, unknown>;
                return (
                  <tr key={recordValue<number>(record, "id", "Id", 0)}>
                    <td>{recordValue<string>(record, "code", "Code", "")}</td>
                    <td>{recordValue<string>(record, "employeeName", "EmployeeName", "")}</td>
                    <td>{recordValue<string>(record, "departmentName", "DepartmentName", "")}</td>
                    <td>{recordValue<string>(record, "createdAt", "CreatedAt", "")}</td>
                    <td>{recordValue<string>(record, "priority", "Priority", "")}</td>
                    <td>{recordValue<string>(record, "statusName", "StatusName", "")}</td>
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
