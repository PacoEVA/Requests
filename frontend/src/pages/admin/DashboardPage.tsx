import { AlertTriangle, CheckCircle2, Clock3, PackageCheck, PackageX, TimerReset } from "lucide-react";
import { useEffect, useState } from "react";
import { MetricCard } from "../../components/common/MetricCard";
import { PageHeader } from "../../components/common/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { dashboardService } from "../../services/dashboard.service";
import type { DashboardStatistics, DashboardSummary } from "../../types/dashboard.types";
import type { RequisitionSummary } from "../../types/requisition.types";
import { recordValue } from "../../utils/record";

const emptySummary: DashboardSummary = {
  counts: { pending: 0, inReview: 0, approved: 0, rejected: 0, delivered: 0, cancelled: 0, urgent: 0 }
};

export function DashboardPage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [recent, setRecent] = useState<RequisitionSummary[]>([]);
  const [stats, setStats] = useState<DashboardStatistics | null>(null);

  useEffect(() => {
    if (!token) return;
    dashboardService.summary(token).then(setSummary).catch(() => setSummary(emptySummary));
    dashboardService.recent(token).then((response) => setRecent(response.requisitions)).catch(() => setRecent([]));
    dashboardService.statistics(token).then(setStats).catch(() => setStats(null));
  }, [token]);

  return (
    <>
      <PageHeader title="Dashboard" eyebrow="Compras" />
      <section className="metrics-grid">
        <MetricCard label="Pendientes" value={summary.counts.pending} icon={Clock3} tone="warning" />
        <MetricCard label="En revisión" value={summary.counts.inReview} icon={TimerReset} tone="info" />
        <MetricCard label="Aprobadas" value={summary.counts.approved} icon={CheckCircle2} tone="success" />
        <MetricCard label="Entregadas" value={summary.counts.delivered} icon={PackageCheck} tone="success" />
        <MetricCard label="Canceladas" value={summary.counts.cancelled} icon={PackageX} tone="danger" />
        <MetricCard label="Urgentes" value={summary.counts.urgent} icon={AlertTriangle} tone="danger" />
      </section>
      <section className="split-grid">
        <div className="surface">
          <h2>Últimas requisiciones</h2>
          <div className="data-table compact-table">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
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
                    <td>{recordValue<string>(item as Record<string, unknown>, "Priority", "PriorityName", "")}</td>
                    <td>{recordValue<string>(item as Record<string, unknown>, "statusName", "StatusName", "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="surface">
          <h2>Estadísticas</h2>
          <dl className="stats-list">
            <div>
              <dt>Tiempo promedio de respuesta</dt>
              <dd>{stats?.averageResponseTimeHours ?? 0} h</dd>
            </div>
            <div>
              <dt>Tiempo promedio hasta entrega</dt>
              <dd>{stats?.averageDeliveryTimeHours ?? 0} h</dd>
            </div>
            <div>
              <dt>Porcentaje entregado</dt>
              <dd>{Math.round((stats?.deliveryRate ?? 0) * 100)}%</dd>
            </div>
          </dl>
        </div>
      </section>
    </>
  );
}
