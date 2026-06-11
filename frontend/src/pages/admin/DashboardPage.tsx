import { AlertTriangle, CheckCircle2, Clock3, PackageCheck, PackageX, TimerReset, XCircle } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { MetricCard } from "../../components/common/MetricCard";
import { PageHeader } from "../../components/common/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import { adminService } from "../../services/admin.service";
import { dashboardService } from "../../services/dashboard.service";
import type { DashboardStatistics, DashboardSummary } from "../../types/dashboard.types";
import type { Department } from "../../types/employee.types";
import type { RequisitionSummary } from "../../types/requisition.types";
import { recordId, recordName, recordValue } from "../../utils/record";

const emptySummary: DashboardSummary = {
  counts: { pending: 0, inReview: 0, approved: 0, rejected: 0, delivered: 0, cancelled: 0, urgent: 0 }
};

const statusOptions = [
  { code: "", label: "Todos" },
  { code: "PENDING", label: "Pendiente" },
  { code: "IN_REVIEW", label: "En revision" },
  { code: "APPROVED", label: "Aprobada" },
  { code: "DELIVERED", label: "Entregada" },
  { code: "REJECTED", label: "Rechazada" },
  { code: "CANCELLED", label: "Cancelada" }
];

const priorities = ["", "Baja", "Media", "Alta", "Urgente"];

function statNumber(record: Record<string, unknown>, camelKey: string, pascalKey: string) {
  return Number(recordValue<number | string>(record, camelKey, pascalKey, 0));
}

function statText(record: Record<string, unknown>, camelKey: string, pascalKey: string) {
  return recordValue<string>(record, camelKey, pascalKey, "");
}

function RankingList({
  title,
  rows,
  labelKey,
  totalKey
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
  labelKey: [string, string];
  totalKey: [string, string];
}) {
  const max = Math.max(...rows.map((row) => statNumber(row, totalKey[0], totalKey[1])), 1);

  return (
    <div className="surface ranking-card">
      <h2>{title}</h2>
      <div className="ranking-list">
        {rows.length === 0 ? <p className="empty-state">Sin datos para el filtro actual.</p> : null}
        {rows.map((row, index) => {
          const total = statNumber(row, totalKey[0], totalKey[1]);
          return (
            <div key={`${title}-${index}`} className="ranking-row">
              <div>
                <strong>{statText(row, labelKey[0], labelKey[1]) || "Sin nombre"}</strong>
                <span>{total.toLocaleString()}</span>
              </div>
              <i style={{ width: `${Math.max((total / max) * 100, 5)}%` }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { token } = useAuth();
  const socket = useSocket();
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [recent, setRecent] = useState<RequisitionSummary[]>([]);
  const [stats, setStats] = useState<DashboardStatistics | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    departmentId: "",
    statusCode: "",
    priority: ""
  });

  const statFilters = useMemo(
    () => ({
      ...filters,
      departmentId: filters.departmentId || undefined
    }),
    [filters]
  );

  const loadDashboard = useCallback(() => {
    if (!token) return;
    dashboardService.summary(token).then(setSummary).catch(() => setSummary(emptySummary));
    dashboardService.recent(token).then((response) => setRecent(response.requisitions)).catch(() => setRecent([]));
    dashboardService.statistics(token, statFilters).then(setStats).catch(() => setStats(null));
  }, [statFilters, token]);

  useEffect(() => {
    if (!token) return;
    adminService.departments(token).then((response) => setDepartments(response.departments)).catch(() => setDepartments([]));
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!socket || !token) return;

    const refresh = () => loadDashboard();
    socket.on("dashboard:summaryUpdated", refresh);
    socket.on("requisition:created", refresh);
    socket.on("requisition:updated", refresh);
    socket.on("requisition:statusChanged", refresh);
    socket.on("requisition:cancelled", refresh);

    return () => {
      socket.off("dashboard:summaryUpdated", refresh);
      socket.off("requisition:created", refresh);
      socket.off("requisition:updated", refresh);
      socket.off("requisition:statusChanged", refresh);
      socket.off("requisition:cancelled", refresh);
    };
  }, [loadDashboard, socket, token]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    loadDashboard();
  }

  return (
    <>
      <PageHeader title="Dashboard" eyebrow="Compras" />
      <section className="metrics-grid">
        <MetricCard label="Pendientes" value={summary.counts.pending} icon={Clock3} tone="warning" />
        <MetricCard label="En revision" value={summary.counts.inReview} icon={TimerReset} tone="info" />
        <MetricCard label="Aprobadas" value={summary.counts.approved} icon={CheckCircle2} tone="success" />
        <MetricCard label="Entregadas" value={summary.counts.delivered} icon={PackageCheck} tone="success" />
        <MetricCard label="Rechazadas" value={summary.counts.rejected} icon={XCircle} tone="danger" />
        <MetricCard label="Canceladas" value={summary.counts.cancelled} icon={PackageX} tone="danger" />
        <MetricCard label="Urgentes" value={summary.counts.urgent} icon={AlertTriangle} tone="danger" />
      </section>

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
            Departamento
            <select value={filters.departmentId} onChange={(event) => setFilters({ ...filters, departmentId: event.target.value })}>
              <option value="">Todos</option>
              {departments.map((department) => (
                <option key={recordId(department)} value={recordId(department)}>
                  {recordName(department)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estado
            <select value={filters.statusCode} onChange={(event) => setFilters({ ...filters, statusCode: event.target.value })}>
              {statusOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prioridad
            <select value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}>
              {priorities.map((priority) => (
                <option key={priority || "all"} value={priority}>
                  {priority || "Todas"}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button" type="submit">
            Actualizar
          </button>
        </form>
      </section>

      <section className="stats-grid">
        <div className="surface stats-overview-card">
          <h2>Indicadores</h2>
          <dl className="stats-list">
            <div>
              <dt>Departamento con mas solicitudes</dt>
              <dd>{stats?.topDepartment ? statText(stats.topDepartment as Record<string, unknown>, "departmentName", "DepartmentName") : "-"}</dd>
            </div>
            <div>
              <dt>Material mas utilizado</dt>
              <dd>{stats?.topMaterial ? statText(stats.topMaterial as Record<string, unknown>, "materialName", "MaterialName") : "-"}</dd>
            </div>
            <div>
              <dt>Tiempo promedio de respuesta</dt>
              <dd>{(stats?.averageResponseTimeHours ?? 0).toFixed(1)} h</dd>
            </div>
            <div>
              <dt>Tiempo promedio hasta entrega</dt>
              <dd>{(stats?.averageDeliveryTimeHours ?? 0).toFixed(1)} h</dd>
            </div>
            <div>
              <dt>Porcentaje entregado</dt>
              <dd>{Math.round((stats?.deliveryRate ?? 0) * 100)}%</dd>
            </div>
            <div>
              <dt>Rechazadas / Canceladas / Urgentes</dt>
              <dd>{stats?.rejectedCount ?? 0} / {stats?.cancelledCount ?? 0} / {stats?.urgentCount ?? 0}</dd>
            </div>
          </dl>
        </div>
        <RankingList
          title="Top departamentos"
          rows={(stats?.topDepartments ?? []) as Array<Record<string, unknown>>}
          labelKey={["departmentName", "DepartmentName"]}
          totalKey={["totalRequisitions", "TotalRequisitions"]}
        />
        <RankingList
          title="Top materiales"
          rows={(stats?.topMaterials ?? []) as Array<Record<string, unknown>>}
          labelKey={["materialName", "MaterialName"]}
          totalKey={["totalQuantityRequested", "TotalQuantityRequested"]}
        />
      </section>

      <section className="split-grid">
        <div className="surface">
          <h2>Ultimas requisiciones</h2>
          <div className="data-table compact-table">
            <table>
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Empleado</th>
                  <th>Departamento</th>
                  <th>Prioridad</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((item) => (
                  <tr key={recordValue<number>(item as Record<string, unknown>, "id", "Id", 0)}>
                    <td>{recordValue<string>(item as Record<string, unknown>, "code", "Code", "")}</td>
                    <td>{recordValue<string>(item as Record<string, unknown>, "employeeName", "EmployeeName", "")}</td>
                    <td>{recordValue<string>(item as Record<string, unknown>, "departmentName", "DepartmentName", "")}</td>
                    <td>{recordValue<string>(item as Record<string, unknown>, "priority", "Priority", "")}</td>
                    <td>{recordValue<string>(item as Record<string, unknown>, "statusName", "StatusName", "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <RankingList
          title="Requisiciones por estado"
          rows={(stats?.requestsByStatus ?? []) as Array<Record<string, unknown>>}
          labelKey={["statusName", "StatusName"]}
          totalKey={["total", "Total"]}
        />
      </section>
    </>
  );
}
