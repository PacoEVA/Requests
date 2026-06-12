import { MessageSquare, PackageCheck, Save, UserPlus } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import { adminService } from "../../services/admin.service";
import { requisitionService } from "../../services/requisition.service";
import type { RequisitionDetail } from "../../types/requisition.types";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import { humanizeHistoryNotes, humanizeHistoryTitle } from "../../utils/requisitionHistory";
import { recordValue } from "../../utils/record";

const finalStatusCodes = new Set(["REJECTED", "DELIVERED", "CANCELLED"]);

const statusOptions = [
  { code: "IN_REVIEW", label: "En revision" },
  { code: "APPROVED", label: "Aprobada" },
  { code: "REJECTED", label: "Rechazada" },
  { code: "IN_PURCHASE", label: "En compra" },
  { code: "READY_TO_DELIVER", label: "Lista para entregar" },
  { code: "CANCELLED", label: "Cancelada" },
];

const allowedTransitions: Record<string, string[]> = {
  PENDING: ["IN_REVIEW", "APPROVED", "REJECTED", "CANCELLED"],
  IN_REVIEW: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["IN_PURCHASE", "READY_TO_DELIVER"],
  IN_PURCHASE: ["READY_TO_DELIVER"],
  READY_TO_DELIVER: [],
  PARTIALLY_DELIVERED: ["IN_PURCHASE"],
};

function asRecords(value: unknown) {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

function text(
  record: Record<string, unknown>,
  camelKey: string,
  pascalKey: string,
  fallback = "-",
) {
  return recordValue<string>(record, camelKey, pascalKey, fallback) || fallback;
}

function numberText(
  record: Record<string, unknown>,
  camelKey: string,
  pascalKey: string,
) {
  const value = recordValue<number | string | null>(
    record,
    camelKey,
    pascalKey,
    null,
  );
  return value === null || value === undefined
    ? "-"
    : Number(value).toLocaleString();
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
  const [requisition, setRequisition] = useState<RequisitionDetail | null>(
    null,
  );
  const [comments, setComments] = useState<Array<Record<string, unknown>>>([]);
  const [statusCode, setStatusCode] = useState("IN_REVIEW");
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [approvedQuantities, setApprovedQuantities] = useState<
    Record<number, string>
  >({});
  const [deliveredQuantities, setDeliveredQuantities] = useState<
    Record<number, string>
  >({});
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadDetail = useCallback(() => {
    if (!token || !id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError("");
    requisitionService
      .adminDetail(token, id)
      .then((response) => setRequisition(response.requisition))
      .catch((requestError) => {
        setRequisition(null);
        setLoadError(friendlyErrorMessage(requestError, "No se pudo cargar la requisicion."));
      })
      .finally(() => setIsLoading(false));
    requisitionService
      .comments({ token }, id)
      .then((response) => setComments(asRecords(response.comments)))
      .catch(() => setComments([]));
  }, [id, token]);

  useEffect(() => {
    if (!token) return;
    adminService
      .users(token)
      .then((response) => setUsers(asRecords(response.users)))
      .catch(() => setUsers([]));
  }, [token]);

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

  useEffect(() => {
    const nextApproved: Record<number, string> = {};
    const nextDelivered: Record<number, string> = {};

    for (const item of items) {
      const itemId = Number(item.Id ?? item.id ?? 0);
      if (!itemId) continue;
      nextApproved[itemId] = String(
        item.QuantityApproved ??
          item.quantityApproved ??
          item.QuantityRequested ??
          item.quantityRequested ??
          0,
      );
      nextDelivered[itemId] = "0";
    }

    setApprovedQuantities(nextApproved);
    setDeliveredQuantities(nextDelivered);
  }, [items]);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Cargando requisicion" eyebrow="Gestion" />
        <section className="surface">
          <EmptyState title="Estamos cargando el detalle" message="Espere un momento mientras buscamos la informacion de la requisicion." />
        </section>
      </>
    );
  }

  if (!requisition) {
    return (
      <>
        <PageHeader title="Requisicion no disponible" eyebrow="Gestion" />
        <section className="surface">
          <EmptyState
            title={loadError ? "No pudimos abrir esta requisicion" : "Esta requisicion no existe"}
            message={loadError || "Verifique el codigo o vuelva al listado para seleccionar otra requisicion."}
          />
          <div className="button-row surface-actions">
            <Link className="secondary-button" to="/admin/requisitions">
              Volver a requisiciones
            </Link>
          </div>
        </section>
      </>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!token || isFinal || allowedStatusOptions.length === 0) return;

    try {
      const approvalItems =
        statusCode === "APPROVED"
          ? items.map((item) => {
              const itemId = Number(item.Id ?? item.id ?? 0);
              return {
                requisitionItemId: itemId,
                quantityApproved: Number(
                  approvedQuantities[itemId] ??
                    item.QuantityRequested ??
                    item.quantityRequested ??
                    0,
                ),
              };
            })
          : undefined;

      await requisitionService.updateStatus(
        token,
        id,
        statusCode,
        reason.trim() || undefined,
        approvalItems,
      );
      setReason("");
      setNotice("Estado actualizado correctamente.");
      loadDetail();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo actualizar el estado.",
      );
    }
  }

  async function assignResponsible(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!token || !assignedToUserId) return;

    try {
      await requisitionService.assign(token, id, Number(assignedToUserId));
      setNotice("Responsable asignado.");
      loadDetail();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo asignar responsable.",
      );
    }
  }

  async function deliver(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!token) return;

    try {
      await requisitionService.deliver(token, id, {
        items: items.map((item) => {
          const itemId = Number(item.Id ?? item.id ?? 0);
          return {
            requisitionItemId: itemId,
            quantityDelivered: Number(
              deliveredQuantities[itemId] ?? 0,
            ),
          };
        }),
        comment: reason.trim() || undefined,
      });
      setNotice("Entrega registrada.");
      loadDetail();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo registrar la entrega.",
      );
    }
  }

  async function addComment(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!token || !comment.trim()) return;

    try {
      const response = await requisitionService.addComment(
        { token },
        id,
        comment.trim(),
      );
      setComments((current) => [
        ...current,
        response.comment as Record<string, unknown>,
      ]);
      setComment("");
      setNotice("Comentario agregado.");
      loadDetail();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo agregar el comentario.",
      );
    }
  }

  return (
    <>
      <PageHeader
        title={text(detail, "code", "Code", "Detalle")}
        eyebrow="Gestion de Requisición"
      />
      <section className="surface detail-layout">
        <div className="detail-main">
          <div className="detail-header">
            <StatusBadge status={currentStatus} />
            <div>
              <h2>
                {text(detail, "employeeName", "EmployeeName", "Empleado")}
              </h2>
              <p>
                {text(
                  detail,
                  "departmentName",
                  "DepartmentName",
                  "Departamento",
                )}
              </p>
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
              <strong>
                {text(
                  detail,
                  "assignedToName",
                  "AssignedToName",
                  "Sin asignar",
                )}
              </strong>
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
                      <td>
                        {text(
                          item,
                          "materialName",
                          "MaterialName",
                          text(
                            item,
                            "manualMaterialName",
                            "ManualMaterialName",
                            "Material",
                          ),
                        )}
                      </td>
                      <td>
                        {numberText(
                          item,
                          "quantityRequested",
                          "QuantityRequested",
                        )}
                      </td>
                      <td>
                        {numberText(
                          item,
                          "quantityApproved",
                          "QuantityApproved",
                        )}
                      </td>
                      <td>
                        {numberText(
                          item,
                          "quantityDelivered",
                          "QuantityDelivered",
                        )}
                      </td>
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
                <article
                  key={String(entry.Id ?? entry.id)}
                  className="timeline-item"
                >
                  <div>
                    <strong>{humanizeHistoryTitle(entry)}</strong>
                    <span>{dateText(entry.CreatedAt ?? entry.createdAt)}</span>
                  </div>
                  <p>{humanizeHistoryNotes(entry)}</p>
                  <small>
                    {text(
                      entry,
                      "employeeName",
                      "EmployeeName",
                      text(
                        entry,
                        "internalUserName",
                        "InternalUserName",
                        "Sistema",
                      ),
                    )}
                  </small>
                </article>
              ))}
            </div>
          </section>

          <section className="detail-section">
            <h2>Comentarios</h2>
            <div className="comment-thread">
              {comments.length === 0 ? (
                <p className="empty-state">No hay comentarios registrados.</p>
              ) : null}
              {comments.map((entry) => (
                <article
                  key={String(entry.Id ?? entry.id)}
                  className="comment-item"
                >
                  <div>
                    <strong>
                      {text(
                        entry,
                        "internalUserName",
                        "InternalUserName",
                        text(entry, "employeeName", "EmployeeName", "Usuario"),
                      )}
                    </strong>
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
            {isFinal ? (
              <p className="form-hint">
                Esta requisicion esta en estado final y no puede modificarse.
              </p>
            ) : null}
            {!isFinal && allowedStatusOptions.length === 0 ? (
              <p className="form-hint">
                No hay cambios de estado directos disponibles desde este estado.
              </p>
            ) : null}
            <label>
              Estado
              <select
                value={isFinal ? currentStatusCode : statusCode}
                disabled={isFinal || allowedStatusOptions.length === 0}
                onChange={(event) => setStatusCode(event.target.value)}
              >
                {isFinal ? (
                  <option value={currentStatusCode}>{currentStatus}</option>
                ) : null}
                {!isFinal
                  ? allowedStatusOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))
                  : null}
              </select>
            </label>
            {statusCode === "APPROVED" ? (
              null
            ) : (
              <label>
                Motivo
                <textarea
                  value={reason}
                  disabled={isFinal || allowedStatusOptions.length === 0}
                  onChange={(event) => setReason(event.target.value)}
                  rows={4}
                />
              </label>
            )}
            {statusCode === "APPROVED" && !isFinal ? (
              <div className="mini-lines">
                <strong>Cantidades aprobadas</strong>
                {items.map((item) => {
                  const itemId = Number(item.Id ?? item.id ?? 0);
                  return (
                    <label key={itemId}>
                      {text(
                        item,
                        "materialName",
                        "MaterialName",
                        text(
                          item,
                          "manualMaterialName",
                          "ManualMaterialName",
                          "Material",
                        ),
                      )}
                      <input
                        min="0.01"
                        step="0.01"
                        type="number"
                        value={approvedQuantities[itemId] ?? ""}
                        onChange={(event) =>
                          setApprovedQuantities({
                            ...approvedQuantities,
                            [itemId]: event.target.value,
                          })
                        }
                      />
                    </label>
                  );
                })}
              </div>
            ) : null}
            <button
              className="primary-button"
              type="submit"
              disabled={isFinal || allowedStatusOptions.length === 0}
            >
              <Save size={18} /> Guardar estado
            </button>
          </form>

          <form className="panel-form" onSubmit={assignResponsible}>
            <h2>Asignar responsable</h2>
            <label>
              Usuario
              <select
                value={assignedToUserId}
                disabled={isFinal}
                onChange={(event) => setAssignedToUserId(event.target.value)}
              >
                <option value="">Seleccione</option>
                {users.map((user) => {
                  const userId = Number(user.Id ?? user.id ?? 0);
                  return (
                    <option key={userId} value={userId}>
                      {text(user, "fullName", "FullName", "Usuario")}
                    </option>
                  );
                })}
              </select>
            </label>
            <button
              className="secondary-button"
              type="submit"
              disabled={isFinal || !assignedToUserId}
            >
              <UserPlus size={18} /> Asignar
            </button>
          </form>

          <form className="panel-form" onSubmit={deliver}>
            <h2>Registrar entrega</h2>
            <div className="mini-lines">
              {items.map((item) => {
                const itemId = Number(item.Id ?? item.id ?? 0);
                const requested = Number(
                  item.QuantityApproved ??
                    item.quantityApproved ??
                    item.QuantityRequested ??
                    item.quantityRequested ??
                    0,
                );
                const delivered = Number(
                  item.QuantityDelivered ?? item.quantityDelivered ?? 0,
                );
                const remaining = Math.max(requested - delivered, 0);
                return (
                  <label key={itemId}>
                    {text(
                      item,
                      "materialName",
                      "MaterialName",
                      text(
                        item,
                        "manualMaterialName",
                        "ManualMaterialName",
                        "Material",
                      ),
                    )}
                    <small>
                      Entregado: {delivered.toLocaleString()} / Pendiente:{" "}
                      {remaining.toLocaleString()}
                    </small>
                    <input
                      min="0"
                      max={remaining}
                      step="0.01"
                      type="number"
                      value={deliveredQuantities[itemId] ?? ""}
                      onChange={(event) =>
                        setDeliveredQuantities({
                          ...deliveredQuantities,
                          [itemId]: event.target.value,
                        })
                      }
                    />
                  </label>
                );
              })}
            </div>
            <button
              className="primary-button"
              type="submit"
              disabled={isFinal || items.length === 0}
            >
              <PackageCheck size={18} /> Guardar entrega
            </button>
          </form>

          <form className="panel-form" onSubmit={addComment}>
            <h2>Comentario</h2>
            <label>
              Mensaje
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={4}
              />
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
