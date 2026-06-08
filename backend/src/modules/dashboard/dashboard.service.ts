import { dashboardRepository } from "./dashboard.repository";

export class DashboardService {
  summary() {
    return dashboardRepository.summary();
  }

  recentRequisitions() {
    return dashboardRepository.recentRequisitions();
  }

  statistics() {
    return dashboardRepository.statistics();
  }
}

export const dashboardService = new DashboardService();
