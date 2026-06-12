import { MessageSquare, XCircle } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useEmployee } from "../../contexts/EmployeeContext";
import { useSocket } from "../../contexts/SocketContext";
import { requisitionService } from "../../services/requisition.service";
import type { RequisitionDetail } from "../../types/requisition.types";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import { humanizeHistoryNotes, humanizeHistoryTitle } from "../../utils/requisitionHistory";
import { recordValue } from "../../utils/record";

const finalStatusCodes = new Set(["REJECTED", "DELIVERED", "CANCELLED"]);

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

export function EmployeeRequisitionDetailPage() {
  const { id = "" } = useParams();
  const { employeeToken } = useEmployee();
  const socket = useSocket();
  const [requisition, setRequisition] = useState<RequisitionDetail | null>(null);
  const [comments, setComments] = useState<Array<Record<string, unknown>>>([]);
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadDetail = useCallback(() => {
    if (!employeeToken || !id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError("");
    requisitionService
      .myDetail(employeeToken, id)
      .then((response) => setRequisition(response.requisition))
      .catch((requestError) => {
        setRequisition(null);
        setLoadError(friendlyErrorMessage(requestError, "No se pudo cargar la requisicion."));
      })
      .finally(() => setIsLoading(false));
    requisitionService.comments({ employeeToken }, id).then((response) => setComments(asRecords(response.comments))).catch(() => setComments([]));
  }, [employeeToken, id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!socket || !employeeToken || !id) return;

    socket.emit("requisition:join", { requisitionId: Number(id), employeeToken });
    const refresh = () => loadDetail();
    socket.on("requisition:updated", refresh);
    socket.on("requisition:statusChanged", refresh);
    socket.on("requisition:cancelled", refresh);
    socket.on("comment:created", refresh);

    return () => {
      socket.emit("requisition:leave", { requisitionId: Number(id) });
      socket.off("requisition:updated", refresh);
      socket.off("requisition:statusChanged", refresh);
      socket.off("requisition:cancelled", refresh);
      socket.off("comment:created", refresh);
    };
  }, [employeeToken, id, loadDetail, socket]);

  const detail = (requisition ?? {}) as Record<string, unknown>;
  const statusName = text(detail, "statusName", "StatusName", "Pendiente");
  const statusCode = text(detail, "statusCode", "StatusCode", "PENDING");
  const isFinal = finalStatusCodes.has(statusCode);
  const items = useMemo(() => asRecords(requisition?.items), [requisition]);
  const history = useMemo(() => asRecords(requisition?.history), [requisition]);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Cargando requisicion" eyebrow="Seguimiento" />
        <section className="surface">
          <EmptyState title="Estamos cargando el detalle" message="Espere un momento mientras buscamos la informacion de su requisicion." />
        </section>
      </>
    );
  }

  if (!requisition) {
    return (
      <>
        <PageHeader title="Requisicion no disponible" eyebrow="Seguimiento" />
        <section className="surface">
          <EmptyState
            title={loadError ? "No pudimos abrir esta requisicion" : "Esta requisicion no existe"}
            message={loadError || "Vuelva a sus requisiciones y seleccione una solicitud disponible."}
          />
          <div className="button-row surface-actions">
            <Link className="secondary-button" to="/employee/requisitions">
              Volver a mis requisiciones
            </Link>
          </div>
        </section>
      </>
    );
  }

  async function cancel() {
    setError("");
    setNotice("");

    if (!employeeToken || isFinal) return;
    const reason = window.prompt("Motivo de cancelacion");
    if (!reason) return;

    try {
      await requisitionService.cancelMine(employeeToken, id, reason);
      setNotice("Requisicion cancelada.");
      loadDetail();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo cancelar la requisicion.");
    }
  }

  async function addComment(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!employeeToken || !comment.trim()) return;

    try {
      const response = await requisitionService.addComment({ employeeToken }, id, comment.trim());
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
      <PageHeader title={text(detail, "code", "Code", "Detalle")} eyebrow="Requisicion" />
      <section className="surface detail-layout">
        <div className="detail-main">
          <div className="detail-header">
            <StatusBadge status={statusName} />
            <div>
              <h2>{text(detail, "departmentName", "DepartmentName", "Departamento")}</h2>
              <p>{text(detail, "generalComment", "GeneralComment", "Sin comentario general")}</p>
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
                    <strong>{humanizeHistoryTitle(entry)}</strong>
                    <span>{dateText(entry.CreatedAt ?? entry.createdAt)}</span>
                  </div>
                  <p>{humanizeHistoryNotes(entry)}</p>
                  <small>{text(entry, "employeeName", "EmployeeName", text(entry, "internalUserName", "InternalUserName", "Sistema"))}</small>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="side-panel">
          <button className="danger-button" type="button" disabled={isFinal} onClick={cancel}>
            <XCircle size={18} /> Cancelar requisicion
          </button>
          {isFinal ? <p className="form-hint">Esta requisicion esta finalizada.</p> : null}

          <form className="panel-form" onSubmit={addComment}>
            <h2>Comentarios</h2>
            <div className="comment-thread compact">
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
