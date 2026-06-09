import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import { requisitionService } from "../../services/requisition.service";
import type { RequisitionSummary } from "../../types/requisition.types";
import { recordValue } from "../../utils/record";

export function RequisitionsPage() {
  const { token } = useAuth();
  const socket = useSocket();
  const [requisitions, setRequisitions] = useState<RequisitionSummary[]>([]);
  const [search, setSearch] = useState("");

  const loadRequisitions = useCallback(() => {
    if (!token) return;
    requisitionService.adminList(token).then((response) => setRequisitions(response.requisitions)).catch(() => setRequisitions([]));
  }, [token]);

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

  const filtered = useMemo(
    () =>
      requisitions.filter((item) =>
        recordValue<string>(item as Record<string, unknown>, "code", "Code", "")
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [requisitions, search]
  );

  return (
    <>
      <PageHeader title="Requisiciones" eyebrow="Gestión" />
      <section className="surface">
        <label className="search-field">
          <Search size={18} />
          <input placeholder="Buscar por código" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Empleado</th>
                <th>Departamento</th>
                <th>Estado</th>
                <th>Prioridad</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const id = recordValue<number>(item as Record<string, unknown>, "id", "Id", 0);
                return (
                  <tr key={id}>
                    <td>
                      <Link to={`/admin/requisitions/${id}`}>
                        {recordValue<string>(item as Record<string, unknown>, "code", "Code", "")}
                      </Link>
                    </td>
                    <td>{recordValue<string>(item as Record<string, unknown>, "employeeName", "EmployeeName", "")}</td>
                    <td>{recordValue<string>(item as Record<string, unknown>, "departmentName", "DepartmentName", "")}</td>
                    <td>
                      <StatusBadge status={recordValue<string>(item as Record<string, unknown>, "statusName", "StatusName", "")} />
                    </td>
                    <td>{recordValue<string>(item as Record<string, unknown>, "priority", "Priority", "Media")}</td>
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
