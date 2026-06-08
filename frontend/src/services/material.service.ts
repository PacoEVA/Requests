import { apiRequest } from "./api";
import type { Material, MaterialCategory } from "../types/material.types";

export const materialService = {
  publicList() {
    return apiRequest<{ materials: Material[] }>("/materials");
  },
  adminList(token: string) {
    return apiRequest<{ materials: Material[] }>("/admin/materials", { token });
  },
  categories() {
    return apiRequest<{ categories: MaterialCategory[] }>("/material-categories");
  },
  create(token: string, payload: { name: string; unitOfMeasure?: string; isRequestable?: boolean }) {
    return apiRequest<{ material: Material }>("/admin/materials", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    });
  }
};
