import { apiRequest } from "./api";
import type {
  CreateRequisitionPayload,
  RequisitionDetail,
  RequisitionSummary
} from "../types/requisition.types";

type RequisitionFilters = Record<string, string | number | undefined | null>;

/** Construye URLs filtradas omitiendo valores vacios. */
function withQuery(path: string, filters?: RequisitionFilters) {
  if (!filters) return path;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export const requisitionService = {
  /** Crea una requisicion desde empleado. */
  create(employeeToken: string, payload: CreateRequisitionPayload) {
    return apiRequest<{ requisition: RequisitionDetail }>("/requisitions", {
      method: "POST",
      employeeToken,
      body: JSON.stringify(payload)
    });
  },
  /** Lista requisiciones propias del empleado. */
  my(employeeToken: string, filters?: RequisitionFilters) {
    return apiRequest<{ requisitions: RequisitionSummary[] }>(withQuery("/requisitions/my", filters), { employeeToken });
  },
  /** Obtiene detalle de requisicion propia. */
  myDetail(employeeToken: string, id: string) {
    return apiRequest<{ requisition: RequisitionDetail }>(`/requisitions/my/${id}`, { employeeToken });
  },
  /** Cancela una requisicion propia con motivo. */
  cancelMine(employeeToken: string, id: string, reason: string) {
    return apiRequest<{ ok: boolean; requisition: RequisitionDetail }>(`/requisitions/my/${id}/cancel`, {
      method: "PATCH",
      employeeToken,
      body: JSON.stringify({ reason })
    });
  },
  /** Lista requisiciones para administracion. */
  adminList(token: string, filters?: RequisitionFilters) {
    return apiRequest<{ requisitions: RequisitionSummary[] }>(withQuery("/admin/requisitions", filters), { token });
  },
  /** Obtiene detalle administrativo de requisicion. */
  adminDetail(token: string, id: string) {
    return apiRequest<{ requisition: RequisitionDetail }>(`/admin/requisitions/${id}`, { token });
  },
  /** Cambia estado y cantidades aprobadas desde administracion. */
  updateStatus(
    token: string,
    id: string,
    statusCode: string,
    reason?: string,
    items?: Array<{ requisitionItemId: number; quantityApproved: number }>
  ) {
    return apiRequest<{ ok: boolean; requisition: RequisitionDetail }>(`/admin/requisitions/${id}/status`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ statusCode, reason, items })
    });
  },
  /** Asigna responsable interno a una requisicion. */
  assign(token: string, id: string, assignedToUserId: number, comment: string) {
    return apiRequest<{ ok: boolean; requisition: RequisitionDetail }>(`/admin/requisitions/${id}/assign`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ assignedToUserId, comment })
    });
  },
  /** Registra entregas parciales o totales. */
  deliver(
    token: string,
    id: string,
    payload: { items: Array<{ requisitionItemId: number; quantityDelivered: number }>; comment?: string }
  ) {
    return apiRequest<{ ok: boolean; requisition: RequisitionDetail }>(`/admin/requisitions/${id}/deliver`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload)
    });
  },
  /** Lista comentarios de una requisicion para cualquier identidad valida. */
  comments(credentials: { token?: string | null; employeeToken?: string | null }, id: string) {
    return apiRequest<{ comments: unknown[] }>(`/requisitions/${id}/comments`, credentials);
  },
  /** Agrega comentario usando token interno o token de empleado. */
  addComment(credentials: { token?: string | null; employeeToken?: string | null }, id: string, message: string) {
    return apiRequest<{ comment: unknown }>(`/requisitions/${id}/comments`, {
      ...credentials,
      method: "POST",
      body: JSON.stringify({ message })
    });
  }
};
