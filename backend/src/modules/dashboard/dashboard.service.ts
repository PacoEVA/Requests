import { dashboardRepository, type DashboardStatisticFilters } from "./dashboard.repository";

export class DashboardService {
  summary() {
    return dashboardRepository.summary();
  }

  recentRequisitions() {
    return dashboardRepository.recentRequisitions();
  }

  statistics(filters: DashboardStatisticFilters = {}) {
    return dashboardRepository.statistics(filters);
  }
}

export const dashboardService = new DashboardService();
