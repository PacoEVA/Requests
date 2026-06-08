import { apiRequest } from "./api";
import type {
  CreateRequisitionPayload,
  RequisitionDetail,
  RequisitionSummary
} from "../types/requisition.types";

export const requisitionService = {
  create(employeeToken: string, payload: CreateRequisitionPayload) {
    return apiRequest<{ requisition: RequisitionDetail }>("/requisitions", {
      method: "POST",
      employeeToken,
      body: JSON.stringify(payload)
    });
  },
  my(employeeToken: string) {
    return apiRequest<{ requisitions: RequisitionSummary[] }>("/requisitions/my", { employeeToken });
  },
  myDetail(employeeToken: string, id: string) {
    return apiRequest<{ requisition: RequisitionDetail }>(`/requisitions/my/${id}`, { employeeToken });
  },
  cancelMine(employeeToken: string, id: string, reason: string) {
    return apiRequest<{ ok: boolean }>(`/requisitions/my/${id}/cancel`, {
      method: "PATCH",
      employeeToken,
      body: JSON.stringify({ reason })
    });
  },
  adminList(token: string) {
    return apiRequest<{ requisitions: RequisitionSummary[] }>("/admin/requisitions", { token });
  },
  adminDetail(token: string, id: string) {
    return apiRequest<{ requisition: RequisitionDetail }>(`/admin/requisitions/${id}`, { token });
  },
  updateStatus(token: string, id: string, statusCode: string, reason?: string) {
    return apiRequest<{ ok: boolean }>(`/admin/requisitions/${id}/status`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ statusCode, reason })
    });
  }
};
