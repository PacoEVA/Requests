import { Search } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import { adminService } from "../../services/admin.service";
import { requisitionService } from "../../services/requisition.service";
import type { Department } from "../../types/employee.types";
import type { RequisitionSummary } from "../../types/requisition.types";
import { recordId, recordName, recordValue } from "../../utils/record";

const statusOptions = [
  { code: "", label: "Todos" },
  { code: "PENDING", label: "Pendiente" },
  { code: "IN_REVIEW", label: "En revision" },
  { code: "APPROVED", label: "Aprobada" },
  { code: "IN_PURCHASE", label: "En compra" },
  { code: "READY_TO_DELIVER", label: "Lista para entregar" },
  { code: "PARTIALLY_DELIVERED", label: "Entrega parcial" },
  { code: "DELIVERED", label: "Entregada" },
  { code: "REJECTED", label: "Rechazada" },
  { code: "CANCELLED", label: "Cancelada" }
];

const priorities = ["", "Baja", "Media", "Alta", "Urgente"];

export function RequisitionsPage() {
  const { token, user } = useAuth();
  const socket = useSocket();
  const supervisorDepartmentId = user?.role === "Supervisor" ? String(user.departmentId ?? "") : "";
  const [requisitions, setRequisitions] = useState<RequisitionSummary[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filters, setFilters] = useState({
    code: "",
    status: "",
    departmentId: "",
    priority: "",
    employeeSearch: "",
    materialSearch: "",
    dateFrom: "",
    dateTo: ""
  });

  const queryFilters = useMemo(
    () => ({
      code: filters.code,
      status: filters.status,
      departmentId: filters.departmentId ? Number(filters.departmentId) : undefined,
      priority: filters.priority,
      employeeSearch: filters.employeeSearch,
      materialSearch: filters.materialSearch,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      pageSize: 100
    }),
    [filters]
  );

  const loadRequisitions = useCallback(() => {
    if (!token) return;
    requisitionService.adminList(token, queryFilters).then((response) => setRequisitions(response.requisitions)).catch(() => setRequisitions([]));
  }, [queryFilters, token]);

  useEffect(() => {
    if (!token) return;
    adminService.departments(token).then((response) => setDepartments(response.departments)).catch(() => setDepartments([]));
  }, [token]);

  useEffect(() => {
    if (supervisorDepartmentId) {
      setFilters((current) => ({ ...current, departmentId: supervisorDepartmentId }));
    }
  }, [supervisorDepartmentId]);

  useEffect(() => {
    loadRequisitions();
  }, [loadRequisitions]);

  useEffect(() => {
    if (!socket || !token) return;

    const refresh = () => loadRequisitions();
    socket.on("requisition:created", refresh);
    socket.on("requisition:updated", refresh);
    socket.on("requisition:statusChanged", refresh);
    socket.on("requisition:cancelled", refresh);
    socket.on("requisition:assigned", refresh);

    return () => {
      socket.off("requisition:created", refresh);
      socket.off("requisition:updated", refresh);
      socket.off("requisition:statusChanged", refresh);
      socket.off("requisition:cancelled", refresh);
      socket.off("requisition:assigned", refresh);
    };
  }, [loadRequisitions, socket, token]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    loadRequisitions();
  }

  return (
    <>
      <PageHeader title="Requisiciones" eyebrow="Gestion" />
      <section className="surface">
        <form className="filter-grid" onSubmit={onSubmit}>
          <label>
            Codigo
            <input value={filters.code} onChange={(event) => setFilters({ ...filters, code: event.target.value })} />
          </label>
          <label>
            Estado
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              {statusOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Departamento
            <select
              value={filters.departmentId}
              disabled={Boolean(supervisorDepartmentId)}
              onChange={(event) => setFilters({ ...filters, departmentId: event.target.value })}
            >
              <option value="">Todos</option>
              {departments.map((department) => (
                <option key={recordId(department)} value={recordId(department)}>
                  {recordName(department)}
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
          <label>
            Empleado
            <input value={filters.employeeSearch} onChange={(event) => setFilters({ ...filters, employeeSearch: event.target.value })} />
          </label>
          <label>
            Material
            <input value={filters.materialSearch} onChange={(event) => setFilters({ ...filters, materialSearch: event.target.value })} />
          </label>
          <label>
            Desde
            <input type="date" value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} />
          </label>
          <label>
            Hasta
            <input type="date" value={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} />
          </label>
          <button className="primary-button" type="submit">
            <Search size={18} /> Buscar
          </button>
        </form>

        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Empleado</th>
                <th>Departamento</th>
                <th>Fecha</th>
                <th>Responsable</th>
                <th>Estado</th>
                <th>Prioridad</th>
              </tr>
            </thead>
            <tbody>
              {requisitions.map((item) => {
                const record = item as Record<string, unknown>;
                const id = recordValue<number>(record, "id", "Id", 0);
                return (
                  <tr key={id}>
                    <td>
                      <Link to={`/admin/requisitions/${id}`}>{recordValue<string>(record, "code", "Code", "")}</Link>
                    </td>
                    <td>{recordValue<string>(record, "employeeName", "EmployeeName", "")}</td>
                    <td>{recordValue<string>(record, "departmentName", "DepartmentName", "")}</td>
                    <td>{recordValue<string>(record, "createdAt", "CreatedAt", "")}</td>
                    <td>{recordValue<string>(record, "assignedToName", "AssignedToName", "Sin asignar")}</td>
                    <td>
                      <StatusBadge status={recordValue<string>(record, "statusName", "StatusName", "")} />
                    </td>
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
