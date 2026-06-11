import { apiRequest } from "./api";
import type { Material } from "../types/material.types";

export interface MaterialPayload {
  itemCode?: string;
  name: string;
  description?: string;
  isRequestable?: boolean;
}

export const materialService = {
  publicList() {
    return apiRequest<{ materials: Material[] }>("/materials");
  },
  adminList(token: string) {
    return apiRequest<{ materials: Material[] }>("/admin/materials", { token });
  },
  create(token: string, payload: MaterialPayload) {
    return apiRequest<{ material: Material }>("/admin/materials", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    });
  },
  update(token: string, id: number, payload: MaterialPayload) {
    return apiRequest<{ material: Material }>(`/admin/materials/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    });
  },
  setActive(token: string, id: number, isActive: boolean) {
    return apiRequest<{ ok: boolean }>(`/admin/materials/${id}/${isActive ? "activate" : "deactivate"}`, {
      method: "PATCH",
      token
    });
  }
};
