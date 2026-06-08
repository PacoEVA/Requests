import { AppError } from "../../middlewares/error.middleware";
import type { EmployeeSession } from "../employees/employees.types";
import type { AuthenticatedUser } from "../auth/auth.types";
import { requisitionsRepository } from "./requisitions.repository";
import type {
  CreateRequisitionInput,
  DeliverInput,
  RequisitionFilters,
  StatusChangeInput
} from "./requisitions.types";

export class RequisitionsService {
  async create(employee: EmployeeSession, input: CreateRequisitionInput) {
    if (input.items.length === 0) {
      throw new AppError("La requisición debe tener al menos un material", 400, "EMPTY_REQUISITION");
    }

    for (const item of input.items) {
      if (!item.materialId && !item.manualMaterialName) {
        throw new AppError("Cada línea debe tener material de catálogo o material manual", 400, "INVALID_ITEM");
      }
    }

    return requisitionsRepository.create(employee.id, input);
  }

  listMine(employee: EmployeeSession, filters: RequisitionFilters) {
    return requisitionsRepository.listForEmployee(employee.id, filters);
  }

  async getMine(employee: EmployeeSession, id: number) {
    const requisition = await requisitionsRepository.findForEmployee(id, employee.id);
    if (!requisition) throw new AppError("Requisición no encontrada", 404, "REQUISITION_NOT_FOUND");
    return requisition;
  }

  cancelMine(employee: EmployeeSession, id: number, reason: string) {
    return requisitionsRepository.cancelByEmployee(id, employee.id, reason);
  }

  listAdmin(filters: RequisitionFilters) {
    return requisitionsRepository.listForAdmin(filters);
  }

  async getAdmin(id: number) {
    const requisition = await requisitionsRepository.findForAdmin(id);
    if (!requisition) throw new AppError("Requisición no encontrada", 404, "REQUISITION_NOT_FOUND");
    return requisition;
  }

  async updateStatus(user: AuthenticatedUser, id: number, input: StatusChangeInput) {
    if ((input.statusCode === "REJECTED" || input.statusCode === "CANCELLED") && !input.reason) {
      throw new AppError("Debe indicar un motivo", 400, "REASON_REQUIRED");
    }

    await requisitionsRepository.updateStatus(id, user.id, input);
  }

  assign(user: AuthenticatedUser, id: number, assignedToUserId: number) {
    return requisitionsRepository.assign(id, assignedToUserId, user.id);
  }

  deliver(user: AuthenticatedUser, id: number, input: DeliverInput) {
    return requisitionsRepository.deliver(id, user.id, input);
  }

  listComments(id: number) {
    return requisitionsRepository.listComments(id);
  }

  addEmployeeComment(employee: EmployeeSession, id: number, message: string) {
    return requisitionsRepository.addEmployeeComment(id, employee.id, message);
  }

  addInternalComment(user: AuthenticatedUser, id: number, message: string) {
    return requisitionsRepository.addInternalComment(id, user.id, message);
  }
}

export const requisitionsService = new RequisitionsService();
