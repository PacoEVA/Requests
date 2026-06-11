import { apiRequest } from "./api";
import type {
  CreateRequisitionPayload,
  RequisitionDetail,
  RequisitionSummary
} from "../types/requisition.types";

type RequisitionFilters = Record<string, string | number | undefined | null>;

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
  create(employeeToken: string, payload: CreateRequisitionPayload) {
    return apiRequest<{ requisition: RequisitionDetail }>("/requisitions", {
      method: "POST",
      employeeToken,
      body: JSON.stringify(payload)
    });
  },
  my(employeeToken: string, filters?: RequisitionFilters) {
    return apiRequest<{ requisitions: RequisitionSummary[] }>(withQuery("/requisitions/my", filters), { employeeToken });
  },
  myDetail(employeeToken: string, id: string) {
    return apiRequest<{ requisition: RequisitionDetail }>(`/requisitions/my/${id}`, { employeeToken });
  },
  cancelMine(employeeToken: string, id: string, reason: string) {
    return apiRequest<{ ok: boolean; requisition: RequisitionDetail }>(`/requisitions/my/${id}/cancel`, {
      method: "PATCH",
      employeeToken,
      body: JSON.stringify({ reason })
    });
  },
  adminList(token: string, filters?: RequisitionFilters) {
    return apiRequest<{ requisitions: RequisitionSummary[] }>(withQuery("/admin/requisitions", filters), { token });
  },
  adminDetail(token: string, id: string) {
    return apiRequest<{ requisition: RequisitionDetail }>(`/admin/requisitions/${id}`, { token });
  },
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
  assign(token: string, id: string, assignedToUserId: number) {
    return apiRequest<{ ok: boolean; requisition: RequisitionDetail }>(`/admin/requisitions/${id}/assign`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ assignedToUserId })
    });
  },
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
  comments(credentials: { token?: string | null; employeeToken?: string | null }, id: string) {
    return apiRequest<{ comments: unknown[] }>(`/requisitions/${id}/comments`, credentials);
  },
  addComment(credentials: { token?: string | null; employeeToken?: string | null }, id: string, message: string) {
    return apiRequest<{ comment: unknown }>(`/requisitions/${id}/comments`, {
      ...credentials,
      method: "POST",
      body: JSON.stringify({ message })
    });
  }
};
