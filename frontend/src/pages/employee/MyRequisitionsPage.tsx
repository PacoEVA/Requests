import { Search } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useEmployee } from "../../contexts/EmployeeContext";
import { useSocket } from "../../contexts/SocketContext";
import { requisitionService } from "../../services/requisition.service";
import type { RequisitionSummary } from "../../types/requisition.types";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import { recordValue } from "../../utils/record";

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

export function MyRequisitionsPage() {
  const { employeeToken } = useEmployee();
  const socket = useSocket();
  const [requisitions, setRequisitions] = useState<RequisitionSummary[]>([]);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    dateFrom: "",
    dateTo: ""
  });

  const queryFilters = useMemo(
    () => ({
      search: filters.search,
      status: filters.status,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      pageSize: 100
    }),
    [filters]
  );

  const loadRequisitions = useCallback(() => {
    if (!employeeToken) return;
    setLoadError("");
    requisitionService
      .my(employeeToken, queryFilters)
      .then((response) => setRequisitions(response.requisitions))
      .catch((error) => {
        setRequisitions([]);
        setLoadError(friendlyErrorMessage(error, "No se pudieron cargar sus requisiciones."));
      });
  }, [employeeToken, queryFilters]);

  useEffect(() => {
    loadRequisitions();
  }, [loadRequisitions]);

  useEffect(() => {
    if (!socket || !employeeToken) return;

    const refresh = () => loadRequisitions();
    socket.on("requisition:created", refresh);
    socket.on("requisition:updated", refresh);
    socket.on("requisition:statusChanged", refresh);
    socket.on("requisition:cancelled", refresh);

    return () => {
      socket.off("requisition:created", refresh);
      socket.off("requisition:updated", refresh);
      socket.off("requisition:statusChanged", refresh);
      socket.off("requisition:cancelled", refresh);
    };
  }, [employeeToken, loadRequisitions, socket]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    loadRequisitions();
  }

  return (
    <>
      <PageHeader title="Mis requisiciones" eyebrow="Seguimiento" />
      <section className="surface">
        <form className="filter-grid compact-filter" onSubmit={onSubmit}>
          <label>
            Codigo
            <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
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

        {loadError ? <p className="form-error">{loadError}</p> : null}

        {requisitions.length === 0 ? (
          <EmptyState
            title={loadError ? "No pudimos mostrar sus requisiciones" : "No tiene requisiciones con estos filtros"}
            message={loadError ? "Revise la conexion o intente nuevamente." : "Cuando cree una requisicion, aparecera en este listado."}
          />
        ) : (
          <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {requisitions.map((requisition) => {
                const record = requisition as Record<string, unknown>;
                const id = recordValue<number>(record, "id", "Id", 0);
                const code = recordValue<string>(record, "code", "Code", "");
                return (
                  <tr key={id}>
                    <td>
                      <Link to={`/employee/requisitions/${id}`}>{code}</Link>
                    </td>
                    <td>
                      <StatusBadge status={recordValue<string>(record, "statusName", "StatusName", "")} />
                    </td>
                    <td>{recordValue<string>(record, "priority", "Priority", "Media")}</td>
                    <td>{recordValue<string>(record, "createdAt", "CreatedAt", "")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </section>
    </>
  );
}
