import type { Server } from "socket.io";

/** Notifica a compras y administradores que se creo una requisicion. */
export function emitRequisitionCreated(io: Server, requisitionId: number) {
  io.to("role:Compras").to("role:Admin").emit("requisition:created", { requisitionId });
}

/** Notifica a empleado, compras y administradores que una requisicion cambio. */
export function emitRequisitionUpdated(io: Server, employeeId: number, requisitionId: number) {
  io.to(`employee:${employeeId}`).to("role:Compras").to("role:Admin").emit("requisition:updated", {
    requisitionId
  });
}
