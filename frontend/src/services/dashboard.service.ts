import { apiRequest } from "./api";
import type { DashboardStatistics, DashboardSummary } from "../types/dashboard.types";
import type { RequisitionSummary } from "../types/requisition.types";

type DashboardStatisticFilters = Record<string, string | undefined | null>;

function withQuery(path: string, filters?: DashboardStatisticFilters) {
  if (!filters) return path;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export const dashboardService = {
  summary(token: string) {
    return apiRequest<DashboardSummary>("/admin/dashboard/summary", { token });
  },
  recent(token: string) {
    return apiRequest<{ requisitions: RequisitionSummary[] }>("/admin/dashboard/recent-requisitions", { token });
  },
  statistics(token: string, filters?: DashboardStatisticFilters) {
    return apiRequest<DashboardStatistics>(withQuery("/admin/dashboard/statistics", filters), { token });
  }
};
