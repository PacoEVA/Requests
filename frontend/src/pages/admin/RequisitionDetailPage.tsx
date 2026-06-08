import { Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAuth } from "../../contexts/AuthContext";
import { requisitionService } from "../../services/requisition.service";
import type { RequisitionDetail } from "../../types/requisition.types";
import { recordValue } from "../../utils/record";

export function RequisitionDetailPage() {
  const { id = "" } = useParams();
  const { token } = useAuth();
  const [requisition, setRequisition] = useState<RequisitionDetail | null>(null);
  const [statusCode, setStatusCode] = useState("IN_REVIEW");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!token || !id) return;
    requisitionService.adminDetail(token, id).then((response) => setRequisition(response.requisition)).catch(() => setRequisition(null));
  }, [id, token]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    await requisitionService.updateStatus(token, id, statusCode, reason || undefined);
  }

  const currentStatus = requisition
    ? recordValue<string>(requisition as Record<string, unknown>, "statusName", "StatusName", "Pendiente")
    : "Pendiente";

  return (
    <>
      <PageHeader title={recordValue<string>((requisition ?? {}) as Record<string, unknown>, "code", "Code", "Detalle")} eyebrow="Gestión" />
      <section className="surface detail-layout">
        <div className="detail-main">
          <StatusBadge status={currentStatus} />
          <h2>Materiales</h2>
          <pre className="json-panel">{JSON.stringify(requisition?.items ?? [], null, 2)}</pre>
          <h2>Historial</h2>
          <pre className="json-panel">{JSON.stringify(requisition?.history ?? [], null, 2)}</pre>
        </div>
        <form className="side-panel" onSubmit={onSubmit}>
          <label>
            Cambiar estado
            <select value={statusCode} onChange={(event) => setStatusCode(event.target.value)}>
              <option value="IN_REVIEW">En revisión</option>
              <option value="APPROVED">Aprobada</option>
              <option value="REJECTED">Rechazada</option>
              <option value="IN_PURCHASE">En compra</option>
              <option value="READY_TO_DELIVER">Lista para entregar</option>
              <option value="DELIVERED">Entregada</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </label>
          <label>
            Motivo
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} />
          </label>
          <button className="primary-button" type="submit">
            <Save size={18} /> Guardar estado
          </button>
        </form>
      </section>
    </>
  );
}
