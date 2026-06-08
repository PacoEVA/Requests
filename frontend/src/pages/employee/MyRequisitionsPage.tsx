import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useEmployee } from "../../contexts/EmployeeContext";
import { requisitionService } from "../../services/requisition.service";
import type { RequisitionSummary } from "../../types/requisition.types";
import { recordValue } from "../../utils/record";

export function MyRequisitionsPage() {
  const { employeeToken } = useEmployee();
  const [requisitions, setRequisitions] = useState<RequisitionSummary[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!employeeToken) return;
    requisitionService.my(employeeToken).then((response) => setRequisitions(response.requisitions)).catch(() => setRequisitions([]));
  }, [employeeToken]);

  const filtered = useMemo(
    () =>
      requisitions.filter((requisition) =>
        recordValue<string>(requisition as Record<string, unknown>, "code", "Code", "")
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [requisitions, search]
  );

  return (
    <>
      <PageHeader title="Mis requisiciones" eyebrow="Seguimiento" />
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
                <th>Estado</th>
                <th>Prioridad</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((requisition) => {
                const id = recordValue<number>(requisition as Record<string, unknown>, "id", "Id", 0);
                const code = recordValue<string>(requisition as Record<string, unknown>, "code", "Code", "");
                return (
                  <tr key={id}>
                    <td>
                      <Link to={`/employee/requisitions/${id}`}>{code}</Link>
                    </td>
                    <td>
                      <StatusBadge status={recordValue<string>(requisition as Record<string, unknown>, "statusName", "StatusName", "")} />
                    </td>
                    <td>{recordValue<string>(requisition as Record<string, unknown>, "priority", "Priority", "Media")}</td>
                    <td>{recordValue<string>(requisition as Record<string, unknown>, "createdAt", "CreatedAt", "")}</td>
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
