import { dashboardRepository, type DashboardStatisticFilters } from "./dashboard.repository";
import { AppError } from "../../middlewares/error.middleware";
import type { AuthenticatedUser } from "../auth/auth.types";

function supervisorDepartmentId(user: AuthenticatedUser) {
  if (user.role !== "Supervisor") return undefined;
  const departmentId = Number(user.departmentId ?? 0);
  if (!departmentId) {
    throw new AppError("Supervisor sin departamento asignado", 403, "SUPERVISOR_DEPARTMENT_REQUIRED");
  }
  return departmentId;
}

export class DashboardService {
  summaryForAll() {
    return dashboardRepository.summary();
  }

  summary(user: AuthenticatedUser) {
    return dashboardRepository.summary(supervisorDepartmentId(user));
  }

  recentRequisitions(user: AuthenticatedUser) {
    return dashboardRepository.recentRequisitions(supervisorDepartmentId(user));
  }

  statistics(user: AuthenticatedUser, filters: DashboardStatisticFilters = {}) {
    const departmentId = supervisorDepartmentId(user);
    return dashboardRepository.statistics({
      ...filters,
      departmentId: departmentId ?? filters.departmentId
    });
  }
}

export const dashboardService = new DashboardService();
