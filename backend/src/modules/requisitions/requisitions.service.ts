import { AppError } from "../../middlewares/error.middleware";
import type { AuthenticatedUser, RoleName } from "../auth/auth.types";
import { dashboardService } from "../dashboard/dashboard.service";
import type { EmployeeSession } from "../employees/employees.types";
import { notificationsService } from "../notifications/notifications.service";
import { usersService } from "../users/users.service";
import { safeEmit } from "../../sockets/socket-hub";
import { requisitionsRepository, type RequisitionItemRecord } from "./requisitions.repository";
import { requisitionEmailService } from "./requisition-email.service";
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
const COMMENT_REQUIRED_STATUS_CODES = new Set(["APPROVED", "CANCELLED", "READY_TO_DELIVER"]);

/** Obtiene un id tolerando columnas SQL PascalCase o payloads camelCase. */
function recordId(record: Record<string, unknown> | null | undefined) {
  return Number(record?.Id ?? record?.id ?? 0);
}

/** Extrae un numero desde un registro dinamico de base de datos. */
function recordNumber(record: Record<string, unknown> | null | undefined, key: string) {
  return Number(record?.[key] ?? 0);
}

/** Extrae el codigo de requisicion desde registros mixtos SQL/API. */
function recordCode(record: Record<string, unknown> | null | undefined) {
  return String(record?.Code ?? record?.code ?? "");
}

/** Extrae texto con fallback desde registros dinamicos. */
function recordText(record: Record<string, unknown> | null | undefined, key: string, fallback = "") {
  return String(record?.[key] ?? fallback);
}

/** Valida si un valor de formulario viene vacio o sin texto util. */
function isBlank(value: unknown) {
  return typeof value !== "string" || value.trim().length === 0;
}

/** Ejecuta efectos secundarios sin fallar la operacion principal. */
async function runSideEffect(task: () => Promise<void>) {
  try {
    await task();
  } catch (error) {
    console.error("Requisition side effect failed", error);
  }
}

/** Restringe acciones operativas a Admin y Compras. */
function assertManager(user: AuthenticatedUser) {
  if (!MANAGER_ROLES.has(user.role)) {
    throw new AppError("No tiene permiso para gestionar requisiciones", 403, "FORBIDDEN");
  }
}

/** Valida que un supervisor solo pueda aprobar requisiciones de su departamento y asignadas a él. */
function assertSupervisorStatusAccess(user: AuthenticatedUser, meta: RequisitionMeta, targetStatusCode: string) {
  if (user.role !== "Supervisor") return;

  const supervisorDepartmentId = Number(user.departmentId ?? 0);
  if (!supervisorDepartmentId) {
    throw new AppError("Supervisor sin departamento asignado", 403, "SUPERVISOR_DEPARTMENT_REQUIRED");
  }

  if (meta.departmentId !== supervisorDepartmentId) {
    throw new AppError("No tiene permiso para esta requisicion", 403, "FORBIDDEN");
  }

  if (Number(meta.assignedToUserId ?? 0) !== user.id) {
    throw new AppError("Esta requisicion no esta asignada a usted", 403, "REQUISITION_NOT_ASSIGNED");
  }

  if (targetStatusCode !== "APPROVED") {
    throw new AppError("Solo puede aprobar esta requisicion", 403, "SUPERVISOR_APPROVAL_ONLY");
  }
}

/** Devuelve el departamento de supervisor o falla si no tiene uno asignado. */
function supervisorDepartmentId(user: AuthenticatedUser) {
  if (user.role !== "Supervisor") return null;
  const departmentId = Number(user.departmentId ?? 0);
  if (!departmentId) {
    throw new AppError("Supervisor sin departamento asignado", 403, "SUPERVISOR_DEPARTMENT_REQUIRED");
  }
  return departmentId;
}

/** Garantiza que una requisicion exista antes de operar sobre ella. */
function assertRequisitionFound(meta: RequisitionMeta | null) {
  if (!meta) throw new AppError("Requisicion no encontrada", 404, "REQUISITION_NOT_FOUND");
  return meta;
}

/** Valida que el cambio de estado sea conocido, permitido y no parta de un estado final. */
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

/** Valida cantidades aprobadas en una transicion de aprobacion. */
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

/** Valida cantidades entregadas y evita exceder lo aprobado/solicitado. */
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

/** Decide si una entrega deja la requisicion parcial o totalmente entregada. */
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
  /** Crea una requisicion de empleado y dispara avisos realtime. */
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

  /** Lista requisiciones del empleado autenticado. */
  listMine(employee: EmployeeSession, filters: RequisitionFilters) {
    return requisitionsRepository.listForEmployee(employee.id, filters);
  }

  /** Obtiene el detalle de una requisicion propia del empleado. */
  async getMine(employee: EmployeeSession, id: number) {
    const requisition = await requisitionsRepository.findForEmployee(id, employee.id);
    if (!requisition) throw new AppError("Requisicion no encontrada", 404, "REQUISITION_NOT_FOUND");
    return requisition;
  }

  /** Cancela una requisicion propia si no esta en estado final. */
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

    await runSideEffect(() =>
      this.afterCancelled(
        meta,
        requisition,
        "Empleado cancelo la requisicion",
        employee.name,
        "Comentario del empleado",
        reason.trim()
      )
    );
    return requisition;
  }

  /** Lista requisiciones visibles para usuarios internos, acotando supervisores. */
  listAdmin(user: AuthenticatedUser, filters: RequisitionFilters) {
    const departmentId = supervisorDepartmentId(user);
    return requisitionsRepository.listForAdmin({
      ...filters,
      departmentId: departmentId ?? filters.departmentId
    });
  }

  /** Obtiene el detalle administrativo respetando el alcance del rol. */
  async getAdmin(user: AuthenticatedUser, id: number) {
    const requisition = await requisitionsRepository.findForAdmin(id, supervisorDepartmentId(user) ?? undefined);
    if (!requisition) throw new AppError("Requisicion no encontrada", 404, "REQUISITION_NOT_FOUND");
    return requisition;
  }

  /** Actualiza estado y cantidades aprobadas validando reglas de transicion. */
  async updateStatus(user: AuthenticatedUser, id: number, input: StatusChangeInput) {
    const meta = assertRequisitionFound(await requisitionsRepository.getMeta(id));
    if (user.role === "Supervisor") {
      assertSupervisorStatusAccess(user, meta, input.statusCode);
    } else {
      assertManager(user);
    }

    if ((input.statusCode === "REJECTED" || input.statusCode === "CANCELLED") && isBlank(input.reason)) {
      throw new AppError("Debe indicar un motivo", 400, "REASON_REQUIRED");
    }

    if (COMMENT_REQUIRED_STATUS_CODES.has(input.statusCode) && isBlank(input.reason)) {
      throw new AppError(
        "Debe incluir el comentario del administrador o supervisor",
        400,
        "COMMENT_REQUIRED"
      );
    }

    if (input.statusCode === "DELIVERED" || input.statusCode === "PARTIALLY_DELIVERED") {
      throw new AppError("Use el endpoint de entrega para registrar cantidades", 400, "USE_DELIVERY_ENDPOINT");
    }

    assertTransitionAllowed(meta, input.statusCode);

    const currentItems = await requisitionsRepository.getItems(id);
    assertApprovalItems(input.items, currentItems);

    const requisition = await requisitionsRepository.updateStatus(id, user.id, input, meta.statusId);
    if (!requisition) throw new AppError("No se pudo actualizar el estado", 409, "STATUS_UPDATE_FAILED");

    await runSideEffect(() => this.afterStatusChanged(meta, requisition, input, user));
    return requisition;
  }

  /** Asigna responsable interno a una requisicion abierta. */
  async assign(user: AuthenticatedUser, id: number, assignedToUserId: number, comment: string) {
    assertManager(user);
    if (isBlank(comment)) {
      throw new AppError("Debe incluir el comentario del administrador", 400, "COMMENT_REQUIRED");
    }

    const meta = assertRequisitionFound(await requisitionsRepository.getMeta(id));
    if (meta.isFinal || isFinalStatus(meta.statusCode)) {
      throw new AppError("No se puede asignar una requisicion finalizada", 409, "FINAL_STATUS");
    }

    const supervisor = await usersService.getById(assignedToUserId);
    if (!supervisor || !Boolean(supervisor.IsActive)) {
      throw new AppError("Supervisor no encontrado o inactivo", 404, "SUPERVISOR_NOT_FOUND");
    }
    if (String(supervisor.RoleName) !== "Supervisor") {
      throw new AppError("La requisicion solo puede asignarse a un supervisor", 400, "SUPERVISOR_REQUIRED");
    }
    if (Number(supervisor.DepartmentId ?? 0) !== meta.departmentId) {
      throw new AppError("El supervisor debe pertenecer al departamento de la requisicion", 400, "DEPARTMENT_MISMATCH");
    }

    const requisition = await requisitionsRepository.assign(id, assignedToUserId, user.id, comment.trim());
    if (!requisition) throw new AppError("Requisicion no encontrada", 404, "REQUISITION_NOT_FOUND");

    await runSideEffect(() => this.afterAssigned(meta, requisition, supervisor, user, comment.trim()));
    return requisition;
  }

  /** Registra cantidades entregadas y calcula el siguiente estado. */
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

  /** Lista comentarios para el empleado propietario. */
  async listCommentsForEmployee(employee: EmployeeSession, id: number) {
    const meta = assertRequisitionFound(await requisitionsRepository.getMeta(id));
    if (meta.employeeId !== employee.id) {
      throw new AppError("Requisicion no encontrada", 404, "REQUISITION_NOT_FOUND");
    }

    return requisitionsRepository.listComments(id);
  }

  /** Lista comentarios para usuarios internos con acceso al detalle. */
  async listCommentsForAdmin(user: AuthenticatedUser, id: number) {
    const requisition = await requisitionsRepository.findForAdmin(id, supervisorDepartmentId(user) ?? undefined);
    if (!requisition) {
      throw new AppError("Requisicion no encontrada", 404, "REQUISITION_NOT_FOUND");
    }
    return requisitionsRepository.listComments(id);
  }

  /** Agrega comentario de empleado y notifica a roles internos. */
  async addEmployeeComment(employee: EmployeeSession, id: number, message: string) {
    const meta = assertRequisitionFound(await requisitionsRepository.getMeta(id));
    if (meta.employeeId !== employee.id) {
      throw new AppError("Requisicion no encontrada", 404, "REQUISITION_NOT_FOUND");
    }

    const comment = await requisitionsRepository.addEmployeeComment(id, employee.id, message.trim());
    await runSideEffect(() => this.afterCommentCreated(meta, comment, employee.name, "EMPLOYEE"));
    return comment;
  }

  /** Agrega comentario interno y notifica al empleado. */
  async addInternalComment(user: AuthenticatedUser, id: number, message: string) {
    assertManager(user);
    const meta = assertRequisitionFound(await requisitionsRepository.getMeta(id));

    const comment = await requisitionsRepository.addInternalComment(id, user.id, message.trim());
    await runSideEffect(() => this.afterCommentCreated(meta, comment, user.fullName, "INTERNAL_USER"));
    return comment;
  }

  /** Notifica la creacion y refresca dashboards despues de crear requisicion. */
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
      this.notifyRole("Compras", requisitionId, "Nueva requisicion", `${code} fue creada`, "REQUISITION_CREATED"),
      requisitionEmailService.notifyCreated(requisition)
    ]);

    await safeEmit((io) => {
      const target = io.to("dashboard:admins").to("role:Compras");
      if (departmentId) target.to(`department:${departmentId}`);
      target.emit("requisition:created", payload);
    });
    await this.emitDashboardSummary(departmentId);
  }

  /** Emite avisos y resumenes tras un cambio de estado. */
  private async afterStatusChanged(
    meta: RequisitionMeta,
    requisition: Record<string, unknown>,
    input: StatusChangeInput,
    actor: AuthenticatedUser
  ) {
    const targetStatusCode = input.statusCode;
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

    if (targetStatusCode === "APPROVED") {
      await requisitionEmailService.notifyApproved(requisition, actor, input.reason!.trim());
    } else if (targetStatusCode === "CANCELLED") {
      await requisitionEmailService.notifyCancelled(
        requisition,
        actor.fullName,
        actor.role === "Supervisor" ? "Comentario del supervisor" : "Comentario del administrador",
        input.reason!.trim()
      );
    } else if (targetStatusCode === "READY_TO_DELIVER") {
      await requisitionEmailService.notifyReady(requisition, actor, input.reason!.trim());
    }

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

  /** Notifica cancelaciones hechas por empleado o administracion. */
  private async afterCancelled(
    meta: RequisitionMeta,
    requisition: Record<string, unknown>,
    message: string,
    actorName: string,
    actorLabel: string,
    comment: string
  ) {
    const code = recordCode(requisition) || meta.code;
    await this.notifyRole("Admin", meta.id, "Requisicion cancelada", `${code} fue cancelada`, "REQUISITION_CANCELLED");
    await this.notifyRole("Compras", meta.id, "Requisicion cancelada", `${code} fue cancelada`, "REQUISITION_CANCELLED");
    await requisitionEmailService.notifyCancelled(requisition, actorName, actorLabel, comment);

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

  /** Notifica asignacion directa al usuario responsable. */
  private async afterAssigned(
    meta: RequisitionMeta,
    requisition: Record<string, unknown>,
    supervisor: Record<string, unknown>,
    actor: AuthenticatedUser,
    comment: string
  ) {
    const assignedToUserId = Number(supervisor.Id ?? supervisor.id ?? 0);
    const code = recordCode(requisition) || meta.code;
    const notification = await notificationsService.create({
      recipientType: "INTERNAL_USER",
      internalUserId: assignedToUserId,
      requisitionId: meta.id,
      title: "Requisicion asignada",
      message: `${code} fue asignada a tu usuario`,
      type: "REQUISITION_ASSIGNED"
    });
    await requisitionEmailService.notifyAssigned(requisition, supervisor, actor, comment);

    await safeEmit((io) => {
      io.to(`internalUser:${assignedToUserId}`).to(`department:${meta.departmentId}`).emit("notification:new", notification);
      io.to(`internalUser:${assignedToUserId}`).to(`department:${meta.departmentId}`).to("dashboard:admins").emit("requisition:assigned", {
        requisitionId: meta.id,
        code,
        assignedToUserId
      });
    });
  }

  /** Notifica entregas y cambios de estado derivados. */
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

  /** Notifica comentarios nuevos a la contraparte correspondiente. */
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

  /** Crea y emite una notificacion para el empleado propietario de la requisicion. */
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

  /** Crea notificaciones por usuario del rol y las emite a sus salas individuales. */
  private async notifyRole(role: RoleName, requisitionId: number, title: string, message: string, type: string) {
    const notifications = await notificationsService.createForRole(role, {
      requisitionId,
      title,
      message,
      type
    });

    if (!notifications.length) return;
    await safeEmit((io) => {
      for (const notification of notifications) {
        const internalUserId = Number(notification.InternalUserId ?? notification.internalUserId ?? 0);
        if (internalUserId) io.to(`internalUser:${internalUserId}`).emit("notification:new", notification);
      }
    });
  }

  /** Emite el resumen actualizado del dashboard global y del departamento afectado. */
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
