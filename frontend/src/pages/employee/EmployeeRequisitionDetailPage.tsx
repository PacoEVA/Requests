import { MessageSquare, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useEmployee } from "../../contexts/EmployeeContext";
import { requisitionService } from "../../services/requisition.service";
import type { RequisitionDetail } from "../../types/requisition.types";
import { recordValue } from "../../utils/record";

export function EmployeeRequisitionDetailPage() {
  const { id = "" } = useParams();
  const { employeeToken } = useEmployee();
  const [requisition, setRequisition] = useState<RequisitionDetail | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!employeeToken || !id) return;
    requisitionService
      .myDetail(employeeToken, id)
      .then((response) => setRequisition(response.requisition))
      .catch(() => setRequisition(null));
  }, [employeeToken, id]);

  async function cancel() {
    if (!employeeToken) return;
    const reason = window.prompt("Motivo de cancelación");
    if (!reason) return;
    await requisitionService.cancelMine(employeeToken, id, reason);
    setMessage("Requisición cancelada");
  }

  const statusName = requisition
    ? recordValue<string>(requisition as Record<string, unknown>, "statusName", "StatusName", "Pendiente")
    : "Pendiente";

  return (
    <>
      <PageHeader title={recordValue<string>((requisition ?? {}) as Record<string, unknown>, "code", "Code", "Detalle")} eyebrow="Requisición" />
      <section className="surface detail-layout">
        <div className="detail-main">
          <StatusBadge status={statusName} />
          <p>{recordValue<string>((requisition ?? {}) as Record<string, unknown>, "generalComment", "GeneralComment", "Sin comentario general")}</p>
          <h2>Materiales</h2>
          <pre className="json-panel">{JSON.stringify(requisition?.items ?? [], null, 2)}</pre>
          <h2>Historial</h2>
          <pre className="json-panel">{JSON.stringify(requisition?.history ?? [], null, 2)}</pre>
        </div>
        <aside className="side-panel">
          <button className="secondary-button" type="button">
            <MessageSquare size={18} /> Agregar comentario
          </button>
          <button className="danger-button" type="button" onClick={cancel}>
            <XCircle size={18} /> Cancelar
          </button>
          {message ? <p className="form-success">{message}</p> : null}
        </aside>
      </section>
    </>
  );
}
