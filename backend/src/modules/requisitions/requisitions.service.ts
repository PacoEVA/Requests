import { AppError } from "../../middlewares/error.middleware";
import type { AuthenticatedUser, RoleName } from "../auth/auth.types";
import { dashboardService } from "../dashboard/dashboard.service";
import type { EmployeeSession } from "../employees/employees.types";
import { notificationsService } from "../notifications/notifications.service";
import { safeEmit } from "../../sockets/socket-hub";
import { requisitionsRepository, type RequisitionItemRecord } from "./requisitions.repository";
import {
  canStayOrTransition,
  canTransition,
  isFinalStatus,
  isKnownStatus
} from "./status-rules";
import type {
  CreateRequisitionInput,
  DeliverInput,
  RequisitionFilters,
  RequisitionMeta,
  StatusChangeInput
} from "./requisitions.types";

const MANAGER_ROLES = new Set<RoleName>(["Admin", "Compras"]);

function recordId(record: Record<string, unknown> | null | undefined) {
  return Number(record?.Id ?? record?.id ?? 0);
}

function recordNumber(record: Record<string, unknown> | null | undefined, key: string) {
  return Number(record?.[key] ?? 0);
}

function recordCode(record: Record<string, unknown> | null | undefined) {
  return String(record?.Code ?? record?.code ?? "");
}

function recordText(record: Record<string, unknown> | null | undefined, key: string, fallback = "") {
  return String(record?.[key] ?? fallback);
}

function isBlank(value: unknown) {
  return typeof value !== "string" || value.trim().length === 0;
}

async function runSideEffect(task: () => Promise<void>) {
  try {
    await task();
  } catch (error) {
    console.error("Requisition side effect failed", error);
  }
}

function assertManager(user: AuthenticatedUser) {
  if (!MANAGER_ROLES.has(user.role)) {
    throw new AppError("No tiene permiso para gestionar requisiciones", 403, "FORBIDDEN");
  }
}

function supervisorDepartmentId(user: AuthenticatedUser) {
  if (user.role !== "Supervisor") return null;
  const departmentId = Number(user.departmentId ?? 0);
  if (!departmentId) {
    throw new AppError("Supervisor sin departamento asignado", 403, "SUPERVISOR_DEPARTMENT_REQUIRED");
  }
  return departmentId;
}

function assertRequisitionFound(meta: RequisitionMeta | null) {
  if (!meta) throw new AppError("Requisicion no encontrada", 404, "REQUISITION_NOT_FOUND");
  return meta;
}

function assertTransitionAllowed(meta: RequisitionMeta, targetStatusCode: string, allowSame = false) {
  if (!isKnownStatus(targetStatusCode)) {
    throw new AppError("Estado no valido", 400, "INVALID_STATUS");
  }

  if (meta.isFinal || isFinalStatus(meta.statusCode)) {
    throw new AppError("La requisicion ya esta en estado final", 409, "FINAL_STATUS");
  }

  const allowed = allowSame
    ? canStayOrTransition(meta.statusCode, targetStatusCode)
    : canTransition(meta.statusCode, targetStatusCode);

  if (!allowed) {
    throw new AppError("Transicion de estado no permitida", 400, "INVALID_STATUS_TRANSITION");
  }
}

function assertApprovalItems(inputItems: StatusChangeInput["items"], currentItems: RequisitionItemRecord[]) {
  if (!inputItems?.length) return;

  const seen = new Set<number>();
  for (const item of inputItems) {
    if (seen.has(item.requisitionItemId)) {
      throw new AppError("No repita lineas de requisicion", 400, "DUPLICATED_ITEM");
    }
    seen.add(item.requisitionItemId);

    const current = currentItems.find((row) => row.id === item.requisitionItemId);
    if (!current) {
      throw new AppError("Linea de requisicion no encontrada", 404, "REQUISITION_ITEM_NOT_FOUND");
    }

    if (item.quantityApproved !== undefined && item.quantityApproved <= 0) {
      throw new AppError("La cantidad aprobada debe ser mayor que cero", 400, "INVALID_APPROVED_QUANTITY");
    }

    if (item.quantityApproved !== undefined && item.quantityApproved > current.quantityRequested) {
      throw new AppError("La cantidad aprobada no puede superar la solicitada", 400, "APPROVED_QUANTITY_TOO_HIGH");
    }
  }
}

function assertDeliveryItems(input: DeliverInput, currentItems: RequisitionItemRecord[]) {
  const seen = new Set<number>();
  let hasNewDelivery = false;

  for (const item of input.items) {
    if (seen.has(item.requisitionItemId)) {
      throw new AppError("No repita lineas de requisicion", 400, "DUPLICATED_ITEM");
    }
    seen.add(item.requisitionItemId);

    const current = currentItems.find((row) => row.id === item.requisitionItemId);
    if (!current) {
      throw new AppError("Linea de requisicion no encontrada", 404, "REQUISITION_ITEM_NOT_FOUND");
    }

    const deliveryTarget = current.quantityApproved ?? current.quantityRequested;
    if (item.quantityDelivered < 0) {
      throw new AppError("La cantidad a entregar no puede ser negativa", 400, "INVALID_DELIVERY_QUANTITY");
    }

    if (current.quantityDelivered + item.quantityDelivered > deliveryTarget) {
      throw new AppError("La cantidad entregada no puede superar la aprobada o solicitada", 400, "DELIVERED_QUANTITY_TOO_HIGH");
    }

    if (item.quantityDelivered > 0) {
      hasNewDelivery = true;
    }
  }

  if (!hasNewDelivery) {
    throw new AppError("Debe registrar al menos una cantidad nueva entregada", 400, "EMPTY_DELIVERY");
  }
}

function deliveryTargetStatus(input: DeliverInput, currentItems: RequisitionItemRecord[]) {
  const deliveredByItem = new Map(input.items.map((item) => [item.requisitionItemId, item.quantityDelivered]));
  const allDelivered = currentItems.every((item) => {
    const target = item.quantityApproved ?? item.quantityRequested;
    const delivered = item.quantityDelivered + (deliveredByItem.get(item.id) ?? 0);
    return delivered >= target;
  });

  return allDelivered ? "DELIVERED" : "PARTIALLY_DELIVERED";
}

export class RequisitionsService {
  async create(employee: EmployeeSession, input: CreateRequisitionInput) {
    if (input.items.length === 0) {
      throw new AppError("La requisicion debe tener al menos un material", 400, "EMPTY_REQUISITION");
    }

    for (const item of input.items) {
      if (item.quantityRequested <= 0) {
        throw new AppError("La cantidad solicitada debe ser mayor que cero", 400, "INVALID_QUANTITY");
      }

      const hasCatalogMaterial = Boolean(item.materialId);
      const hasManualMaterial = !isBlank(item.manualMaterialName);
      if (hasCatalogMaterial === hasManualMaterial) {
        throw new AppError("Cada linea debe tener material de catalogo o material manual", 400, "INVALID_ITEM");
      }
    }

    const requisition = await requisitionsRepository.create(employee.id, input);
    await runSideEffect(() => this.afterCreated(requisition));
    return requisition;
  }

  listMine(employee: EmployeeSession, filters: RequisitionFilters) {
    return requisitionsRepository.listForEmployee(employee.id, filters);
  }

  async getMine(employee: EmployeeSession, id: number) {
    const requisition = await requisitionsRepository.findForEmployee(id, employee.id);
    if (!requisition) throw new AppError("Requisicion no encontrada", 404, "REQUISITION_NOT_FOUND");
    return requisition;
  }

  async cancelMine(employee: EmployeeSession, id: number, reason: string) {
    if (isBlank(reason)) {
      throw new AppError("Debe indicar un motivo", 400, "REASON_REQUIRED");
    }

    const meta = assertRequisitionFound(await requisitionsRepository.getMeta(id));
    if (meta.employeeId !== employee.id) {
      throw new AppError("Requisicion no encontrada", 404, "REQUISITION_NOT_FOUND");
    }

    if (meta.isFinal || isFinalStatus(meta.statusCode)) {
      throw new AppError("No se puede cancelar una requisicion finalizada", 409, "FINAL_STATUS");
    }

    const requisition = await requisitionsRepository.cancelByEmployee(id, employee.id, reason.trim());
    if (!requisition) throw new AppError("No se pudo cancelar la requisicion", 409, "CANCEL_NOT_ALLOWED");

    await runSideEffect(() => this.afterCancelled(meta, requisition, "Empleado cancelo la requisicion"));
    return requisition;
  }

  listAdmin(user: AuthenticatedUser, filters: RequisitionFilters) {
    const departmentId = supervisorDepartmentId(user);
    return requisitionsRepository.listForAdmin({
      ...filters,
      departmentId: departmentId ?? filters.departmentId
    });
  }

  async getAdmin(user: AuthenticatedUser, id: number) {
    const requisition = await requisitionsRepository.findForAdmin(id, supervisorDepartmentId(user) ?? undefined);
    if (!requisition) throw new AppError("Requisicion no encontrada", 404, "REQUISITION_NOT_FOUND");
    return requisition;
  }

  async updateStatus(user: AuthenticatedUser, id: number, input: StatusChangeInput) {
    assertManager(user);

    if ((input.statusCode === "REJECTED" || input.statusCode === "CANCELLED") && isBlank(input.reason)) {
      throw new AppError("Debe indicar un motivo", 400, "REASON_REQUIRED");
    }

    if (input.statusCode === "DELIVERED" || input.statusCode === "PARTIALLY_DELIVERED") {
      throw new AppError("Use el endpoint de entrega para registrar cantidades", 400, "USE_DELIVERY_ENDPOINT");
    }

    const meta = assertRequisitionFound(await requisitionsRepository.getMeta(id));
    assertTransitionAllowed(meta, input.statusCode);

    const currentItems = await requisitionsRepository.getItems(id);
    assertApprovalItems(input.items, currentItems);

    const requisition = await requisitionsRepository.updateStatus(id, user.id, input, meta.statusId);
    if (!requisition) throw new AppError("No se pudo actualizar el estado", 409, "STATUS_UPDATE_FAILED");

    await runSideEffect(() => this.afterStatusChanged(meta, requisition, input.statusCode));
    return requisition;
  }

  async assign(user: AuthenticatedUser, id: number, assignedToUserId: number) {
    assertManager(user);
    const meta = assertRequisitionFound(await requisitionsRepository.getMeta(id));
    if (meta.isFinal || isFinalStatus(meta.statusCode)) {
      throw new AppError("No se puede asignar una requisicion finalizada", 409, "FINAL_STATUS");
    }

    const requisition = await requisitionsRepository.assign(id, assignedToUserId, user.id);
    if (!requisition) throw new AppError("Requisicion no encontrada", 404, "REQUISITION_NOT_FOUND");

    await runSideEffect(() => this.afterAssigned(meta, requisition, assignedToUserId));
    return requisition;
  }

  async deliver(user: AuthenticatedUser, id: number, input: DeliverInput) {
    assertManager(user);
    const meta = assertRequisitionFound(await requisitionsRepository.getMeta(id));

    const currentItems = await requisitionsRepository.getItems(id);
    assertDeliveryItems(input, currentItems);

    const targetStatus = deliveryTargetStatus(input, currentItems);
    assertTransitionAllowed(meta, targetStatus, true);

    const result = await requisitionsRepository.deliver(id, user.id, input, meta.statusId);
    if (!result?.requisition) {
      throw new AppError("No se pudo registrar la entrega", 409, "DELIVERY_FAILED");
    }

    await runSideEffect(() => this.afterDelivered(meta, result));
    return result.requisition;
  }

  async listCommentsForEmployee(employee: EmployeeSession, id: number) {
    const meta = assertRequisitionFound(await requisitionsRepository.getMeta(id));
    if (meta.employeeId !== employee.id) {
      throw new AppError("Requisicion no encontrada", 404, "REQUISITION_NOT_FOUND");
    }

    return requisitionsRepository.listComments(id);
  }

  async listCommentsForAdmin(user: AuthenticatedUser, id: number) {
    const requisition = await requisitionsRepository.findForAdmin(id, supervisorDepartmentId(user) ?? undefined);
    if (!requisition) {
      throw new AppError("Requisicion no encontrada", 404, "REQUISITION_NOT_FOUND");
    }
    return requisitionsRepository.listComments(id);
  }

  async addEmployeeComment(employee: EmployeeSession, id: number, message: string) {
    const meta = assertRequisitionFound(await requisitionsRepository.getMeta(id));
    if (meta.employeeId !== employee.id) {
      throw new AppError("Requisicion no encontrada", 404, "REQUISITION_NOT_FOUND");
    }

    const comment = await requisitionsRepository.addEmployeeComment(id, employee.id, message.trim());
    await runSideEffect(() => this.afterCommentCreated(meta, comment, employee.name, "EMPLOYEE"));
    return comment;
  }

  async addInternalComment(user: AuthenticatedUser, id: number, message: string) {
    assertManager(user);
    const meta = assertRequisitionFound(await requisitionsRepository.getMeta(id));

    const comment = await requisitionsRepository.addInternalComment(id, user.id, message.trim());
    await runSideEffect(() => this.afterCommentCreated(meta, comment, user.fullName, "INTERNAL_USER"));
    return comment;
  }

  private async afterCreated(requisition: Record<string, unknown> | null) {
    if (!requisition) return;
    const requisitionId = recordId(requisition);
    const departmentId = recordNumber(requisition, "DepartmentId");
    const code = recordCode(requisition);
    const payload = {
      requisition: {
        id: requisitionId,
        code,
        employeeName: recordText(requisition, "EmployeeName"),
        departmentName: recordText(requisition, "DepartmentName"),
        priority: recordText(requisition, "Priority"),
        status: recordText(requisition, "StatusName"),
        createdAt: requisition.CreatedAt ?? requisition.createdAt
      }
    };

    await Promise.all([
      this.notifyRole("Admin", requisitionId, "Nueva requisicion", `${code} fue creada`, "REQUISITION_CREATED"),
      this.notifyRole("Compras", requisitionId, "Nueva requisicion", `${code} fue creada`, "REQUISITION_CREATED")
    ]);

    await safeEmit((io) => {
      const target = io.to("dashboard:admins").to("role:Compras");
      if (departmentId) target.to(`department:${departmentId}`);
      target.emit("requisition:created", payload);
    });
    await this.emitDashboardSummary(departmentId);
  }

  private async afterStatusChanged(meta: RequisitionMeta, requisition: Record<string, unknown>, targetStatusCode: string) {
    const code = recordCode(requisition) || meta.code;
    const newStatusName = recordText(requisition, "StatusName", targetStatusCode);
    const payload = {
      requisitionId: meta.id,
      code,
      previousStatus: meta.statusName,
      newStatus: newStatusName,
      message: `Tu requisicion ${code} cambio a ${newStatusName}`
    };

    await this.notifyEmployee(meta.employeeId, meta.id, "Estado actualizado", `${code} cambio a ${newStatusName}`, "STATUS_CHANGED");

    await safeEmit((io) => {
      io.to(`employee:${meta.employeeId}`)
        .to(`requisition:${meta.id}`)
        .to("dashboard:admins")
        .to(`department:${meta.departmentId}`)
        .emit("requisition:statusChanged", payload);
    });

    if (targetStatusCode === "CANCELLED") {
      await safeEmit((io) => {
        io.to(`employee:${meta.employeeId}`)
          .to(`requisition:${meta.id}`)
          .to("dashboard:admins")
          .to(`department:${meta.departmentId}`)
          .emit("requisition:cancelled", {
            requisitionId: meta.id,
            code
          });
      });
    }

    await this.emitDashboardSummary(meta.departmentId);
  }

  private async afterCancelled(meta: RequisitionMeta, requisition: Record<string, unknown>, message: string) {
    const code = recordCode(requisition) || meta.code;
    await this.notifyRole("Admin", meta.id, "Requisicion cancelada", `${code} fue cancelada`, "REQUISITION_CANCELLED");
    await this.notifyRole("Compras", meta.id, "Requisicion cancelada", `${code} fue cancelada`, "REQUISITION_CANCELLED");

    await safeEmit((io) => {
      io.to(`employee:${meta.employeeId}`)
        .to(`requisition:${meta.id}`)
        .to("dashboard:admins")
        .to(`department:${meta.departmentId}`)
        .emit("requisition:cancelled", {
          requisitionId: meta.id,
          code,
          previousStatus: meta.statusName,
          message
        });
    });
    await this.emitDashboardSummary(meta.departmentId);
  }

  private async afterAssigned(meta: RequisitionMeta, requisition: Record<string, unknown>, assignedToUserId: number) {
    const code = recordCode(requisition) || meta.code;
    const notification = await notificationsService.create({
      recipientType: "INTERNAL_USER",
      internalUserId: assignedToUserId,
      requisitionId: meta.id,
      title: "Requisicion asignada",
      message: `${code} fue asignada a tu usuario`,
      type: "REQUISITION_ASSIGNED"
    });

    await safeEmit((io) => {
      io.to(`internalUser:${assignedToUserId}`).emit("notification:new", notification);
      io.to(`internalUser:${assignedToUserId}`).to("dashboard:admins").to(`department:${meta.departmentId}`).emit("requisition:assigned", {
        requisitionId: meta.id,
        code,
        assignedToUserId
      });
    });
  }

  private async afterDelivered(meta: RequisitionMeta, result: { requisition: Record<string, unknown> | null; statusCode: string; statusName: string }) {
    const code = recordCode(result.requisition) || meta.code;
    await this.notifyEmployee(meta.employeeId, meta.id, "Entrega registrada", `${code} cambio a ${result.statusName}`, "DELIVERY_REGISTERED");

    await safeEmit((io) => {
      io.to(`employee:${meta.employeeId}`)
        .to(`requisition:${meta.id}`)
        .to("dashboard:admins")
        .to(`department:${meta.departmentId}`)
        .emit("requisition:updated", {
          requisitionId: meta.id,
          code
        });
      io.to(`employee:${meta.employeeId}`)
        .to(`requisition:${meta.id}`)
        .to("dashboard:admins")
        .to(`department:${meta.departmentId}`)
        .emit("requisition:statusChanged", {
          requisitionId: meta.id,
          code,
          previousStatus: meta.statusName,
          newStatus: result.statusName,
          message: `Tu requisicion ${code} cambio a ${result.statusName}`
        });

    });

    await this.emitDashboardSummary(meta.departmentId);
  }

  private async afterCommentCreated(meta: RequisitionMeta, comment: Record<string, unknown>, authorName: string, authorType: "EMPLOYEE" | "INTERNAL_USER") {
    const payload = {
      requisitionId: meta.id,
      comment: {
        ...comment,
        authorName
      }
    };

    if (authorType === "EMPLOYEE") {
      await Promise.all([
        this.notifyRole("Admin", meta.id, "Nuevo comentario", `Comentario nuevo en ${meta.code}`, "COMMENT_CREATED"),
        this.notifyRole("Compras", meta.id, "Nuevo comentario", `Comentario nuevo en ${meta.code}`, "COMMENT_CREATED")
      ]);
    } else {
      await this.notifyEmployee(meta.employeeId, meta.id, "Nuevo comentario", `Comentario nuevo en ${meta.code}`, "COMMENT_CREATED");
    }

    await safeEmit((io) => {
      io.to(`employee:${meta.employeeId}`)
        .to(`requisition:${meta.id}`)
        .to("dashboard:admins")
        .to(`department:${meta.departmentId}`)
        .emit("comment:created", payload);
    });
  }

  private async notifyEmployee(employeeId: number, requisitionId: number, title: string, message: string, type: string) {
    const notification = await notificationsService.create({
      recipientType: "EMPLOYEE",
      employeeId,
      requisitionId,
      title,
      message,
      type
    });

    await safeEmit((io) => {
      io.to(`employee:${employeeId}`).emit("notification:new", notification);
    });
  }

  private async notifyRole(role: RoleName, requisitionId: number, title: string, message: string, type: string) {
    const notification = await notificationsService.createForRole(role, {
      requisitionId,
      title,
      message,
      type
    });

    if (!notification) return;
    await safeEmit((io) => {
      io.to(`role:${role}`).emit("notification:new", notification);
    });
  }

  private async emitDashboardSummary(departmentId?: number) {
    const summary = await dashboardService.summaryForAll();
    await safeEmit((io) => {
      io.to("dashboard:admins").emit("dashboard:summaryUpdated", summary);
      if (departmentId) {
        io.to(`department:${departmentId}`).emit("dashboard:summaryUpdated", { departmentId });
      }
    });
  }
}

export const requisitionsService = new RequisitionsService();
