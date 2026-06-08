import type { Server } from "socket.io";

export function emitRequisitionCreated(io: Server, requisitionId: number) {
  io.to("role:Compras").to("role:Admin").emit("requisition:created", { requisitionId });
}

export function emitRequisitionUpdated(io: Server, employeeId: number, requisitionId: number) {
  io.to(`employee:${employeeId}`).to("role:Compras").to("role:Admin").emit("requisition:updated", {
    requisitionId
  });
}
