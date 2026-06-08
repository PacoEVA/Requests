import { apiRequest } from "./api";
import type { DashboardStatistics, DashboardSummary } from "../types/dashboard.types";
import type { RequisitionSummary } from "../types/requisition.types";

export const dashboardService = {
  summary(token: string) {
    return apiRequest<DashboardSummary>("/admin/dashboard/summary", { token });
  },
  recent(token: string) {
    return apiRequest<{ requisitions: RequisitionSummary[] }>("/admin/dashboard/recent-requisitions", { token });
  },
  statistics(token: string) {
    return apiRequest<DashboardStatistics>("/admin/dashboard/statistics", { token });
  }
};
