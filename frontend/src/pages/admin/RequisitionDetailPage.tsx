import { MessageSquare, Save } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import { requisitionService } from "../../services/requisition.service";
import type { RequisitionDetail } from "../../types/requisition.types";
import { recordValue } from "../../utils/record";

const finalStatusCodes = new Set(["REJECTED", "DELIVERED", "CANCELLED"]);

const statusOptions = [
  { code: "IN_REVIEW", label: "En revision" },
  { code: "APPROVED", label: "Aprobada" },
  { code: "REJECTED", label: "Rechazada" },
  { code: "IN_PURCHASE", label: "En compra" },
  { code: "READY_TO_DELIVER", label: "Lista para entregar" },
  { code: "CANCELLED", label: "Cancelada" }
];

const allowedTransitions: Record<string, string[]> = {
  PENDING: ["IN_REVIEW", "APPROVED", "REJECTED", "CANCELLED"],
  IN_REVIEW: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["IN_PURCHASE", "READY_TO_DELIVER"],
  IN_PURCHASE: ["READY_TO_DELIVER"],
  READY_TO_DELIVER: [],
  PARTIALLY_DELIVERED: ["IN_PURCHASE"]
};

function asRecords(value: unknown) {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

function text(record: Record<string, unknown>, camelKey: string, pascalKey: string, fallback = "-") {
  return recordValue<string>(record, camelKey, pascalKey, fallback) || fallback;
}

function numberText(record: Record<string, unknown>, camelKey: string, pascalKey: string) {
  const value = recordValue<number | string | null>(record, camelKey, pascalKey, null);
  return value === null || value === undefined ? "-" : Number(value).toLocaleString();
}

function dateText(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export function RequisitionDetailPage() {
  const { id = "" } = useParams();
  const { token } = useAuth();
  const socket = useSocket();
  const [requisition, setRequisition] = useState<RequisitionDetail | null>(null);
  const [comments, setComments] = useState<Array<Record<string, unknown>>>([]);
  const [statusCode, setStatusCode] = useState("IN_REVIEW");
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadDetail = useCallback(() => {
    if (!token || !id) return;
    requisitionService.adminDetail(token, id).then((response) => setRequisition(response.requisition)).catch(() => setRequisition(null));
    requisitionService.comments({ token }, id).then((response) => setComments(asRecords(response.comments))).catch(() => setComments([]));
  }, [id, token]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!socket || !token || !id) return;

    socket.emit("requisition:join", { requisitionId: Number(id), token });
    const refresh = () => loadDetail();
    socket.on("requisition:updated", refresh);
    socket.on("requisition:statusChanged", refresh);
    socket.on("requisition:cancelled", refresh);
    socket.on("requisition:assigned", refresh);
    socket.on("comment:created", refresh);

    return () => {
      socket.emit("requisition:leave", { requisitionId: Number(id) });
      socket.off("requisition:updated", refresh);
      socket.off("requisition:statusChanged", refresh);
      socket.off("requisition:cancelled", refresh);
      socket.off("requisition:assigned", refresh);
      socket.off("comment:created", refresh);
    };
  }, [id, loadDetail, socket, token]);

  const detail = (requisition ?? {}) as Record<string, unknown>;
  const currentStatus = text(detail, "statusName", "StatusName", "Pendiente");
  const currentStatusCode = text(detail, "statusCode", "StatusCode", "PENDING");
  const isFinal = finalStatusCodes.has(currentStatusCode);
  const items = useMemo(() => asRecords(requisition?.items), [requisition]);
  const history = useMemo(() => asRecords(requisition?.history), [requisition]);
  const allowedStatusOptions = useMemo(() => {
    const allowedCodes = allowedTransitions[currentStatusCode] ?? [];
    return statusOptions.filter((option) => allowedCodes.includes(option.code));
  }, [currentStatusCode]);

  useEffect(() => {
    if (allowedStatusOptions[0]) {
      setStatusCode(allowedStatusOptions[0].code);
    }
  }, [allowedStatusOptions]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!token || isFinal || allowedStatusOptions.length === 0) return;

    try {
      await requisitionService.updateStatus(token, id, statusCode, reason.trim() || undefined);
      setReason("");
      setNotice("Estado actualizado correctamente.");
      loadDetail();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo actualizar el estado.");
    }
  }

  async function addComment(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!token || !comment.trim()) return;

    try {
      const response = await requisitionService.addComment({ token }, id, comment.trim());
      setComments((current) => [...current, response.comment as Record<string, unknown>]);
      setComment("");
      setNotice("Comentario agregado.");
      loadDetail();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo agregar el comentario.");
    }
  }

  return (
    <>
      <PageHeader title={text(detail, "code", "Code", "Detalle")} eyebrow="Gestion" />
      <section className="surface detail-layout">
        <div className="detail-main">
          <div className="detail-header">
            <StatusBadge status={currentStatus} />
            <div>
              <h2>{text(detail, "employeeName", "EmployeeName", "Empleado")}</h2>
              <p>{text(detail, "departmentName", "DepartmentName", "Departamento")}</p>
            </div>
          </div>

          <div className="detail-summary-grid">
            <div>
              <span>Prioridad</span>
              <strong>{text(detail, "priority", "Priority", "Media")}</strong>
            </div>
            <div>
              <span>Creada</span>
              <strong>{dateText(detail.CreatedAt ?? detail.createdAt)}</strong>
            </div>
            <div>
              <span>Asignada a</span>
              <strong>{text(detail, "assignedToName", "AssignedToName", "Sin asignar")}</strong>
            </div>
          </div>

          <section className="detail-section">
            <h2>Materiales solicitados</h2>
            <div className="data-table compact-table">
              <table>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Solicitado</th>
                    <th>Aprobado</th>
                    <th>Entregado</th>
                    <th>Unidad</th>
                    <th>Comentario</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={String(item.Id ?? item.id)}>
                      <td>{text(item, "materialName", "MaterialName", text(item, "manualMaterialName", "ManualMaterialName", "Material"))}</td>
                      <td>{numberText(item, "quantityRequested", "QuantityRequested")}</td>
                      <td>{numberText(item, "quantityApproved", "QuantityApproved")}</td>
                      <td>{numberText(item, "quantityDelivered", "QuantityDelivered")}</td>
                      <td>{text(item, "unitOfMeasure", "UnitOfMeasure", text(item, "materialUnitOfMeasure", "MaterialUnitOfMeasure", "-"))}</td>
                      <td>{text(item, "comment", "Comment", "-")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="detail-section">
            <h2>Historial</h2>
            <div className="timeline-list">
              {history.map((entry) => (
                <article key={String(entry.Id ?? entry.id)} className="timeline-item">
                  <div>
                    <strong>{text(entry, "newStatusName", "NewStatusName", text(entry, "action", "Action", "Actualizacion"))}</strong>
                    <span>{dateText(entry.CreatedAt ?? entry.createdAt)}</span>
                  </div>
                  <p>{text(entry, "notes", "Notes", "Sin notas")}</p>
                  <small>
                    {text(entry, "employeeName", "EmployeeName", text(entry, "internalUserName", "InternalUserName", "Sistema"))}
                  </small>
                </article>
              ))}
            </div>
          </section>

          <section className="detail-section">
            <h2>Comentarios</h2>
            <div className="comment-thread">
              {comments.length === 0 ? <p className="empty-state">No hay comentarios registrados.</p> : null}
              {comments.map((entry) => (
                <article key={String(entry.Id ?? entry.id)} className="comment-item">
                  <div>
                    <strong>{text(entry, "internalUserName", "InternalUserName", text(entry, "employeeName", "EmployeeName", "Usuario"))}</strong>
                    <span>{dateText(entry.CreatedAt ?? entry.createdAt)}</span>
                  </div>
                  <p>{text(entry, "message", "Message", "")}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="side-panel">
          <form className="panel-form" onSubmit={onSubmit}>
            <h2>Cambiar estado</h2>
            {isFinal ? <p className="form-hint">Esta requisicion esta en estado final y no puede modificarse.</p> : null}
            {!isFinal && allowedStatusOptions.length === 0 ? <p className="form-hint">No hay cambios de estado directos disponibles desde este estado.</p> : null}
            <label>
              Estado
              <select value={isFinal ? currentStatusCode : statusCode} disabled={isFinal || allowedStatusOptions.length === 0} onChange={(event) => setStatusCode(event.target.value)}>
                {isFinal ? <option value={currentStatusCode}>{currentStatus}</option> : null}
                {!isFinal
                  ? allowedStatusOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))
                  : null}
              </select>
            </label>
            <label>
              Motivo
              <textarea value={reason} disabled={isFinal || allowedStatusOptions.length === 0} onChange={(event) => setReason(event.target.value)} rows={4} />
            </label>
            <button className="primary-button" type="submit" disabled={isFinal || allowedStatusOptions.length === 0}>
              <Save size={18} /> Guardar estado
            </button>
          </form>

          <form className="panel-form" onSubmit={addComment}>
            <h2>Comentario</h2>
            <label>
              Mensaje
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={4} />
            </label>
            <button className="secondary-button" type="submit">
              <MessageSquare size={18} /> Agregar comentario
            </button>
          </form>

          {notice ? <p className="form-success">{notice}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
        </aside>
      </section>
    </>
  );
}
