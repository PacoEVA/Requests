import { dashboardRepository, type DashboardStatisticFilters } from "./dashboard.repository";
import { AppError } from "../../middlewares/error.middleware";
import type { AuthenticatedUser } from "../auth/auth.types";

/** Obtiene el departamento permitido para supervisores y valida su configuracion. */
function supervisorDepartmentId(user: AuthenticatedUser) {
  if (user.role !== "Supervisor") return undefined;
  const departmentId = Number(user.departmentId ?? 0);
  if (!departmentId) {
    throw new AppError("Supervisor sin departamento asignado", 403, "SUPERVISOR_DEPARTMENT_REQUIRED");
  }
  return departmentId;
}

export class DashboardService {
  /** Devuelve resumen global para emisiones realtime internas. */
  summaryForAll() {
    return dashboardRepository.summary();
  }

  /** Devuelve resumen limitado por departamento cuando el usuario es supervisor. */
  summary(user: AuthenticatedUser) {
    return dashboardRepository.summary(supervisorDepartmentId(user));
  }

  /** Lista requisiciones recientes respetando alcance de rol. */
  recentRequisitions(user: AuthenticatedUser) {
    return dashboardRepository.recentRequisitions(supervisorDepartmentId(user));
  }

  /** Aplica alcance de rol sobre los filtros estadisticos solicitados. */
  statistics(user: AuthenticatedUser, filters: DashboardStatisticFilters = {}) {
    const departmentId = supervisorDepartmentId(user);
    return dashboardRepository.statistics({
      ...filters,
      departmentId: departmentId ?? filters.departmentId
    });
  }
}

export const dashboardService = new DashboardService();
