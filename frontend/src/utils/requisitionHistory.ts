import { recordValue } from "./record";

const statusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  IN_REVIEW: "En revision",
  APPROVED: "Aprobada",
  IN_PURCHASE: "En compra",
  READY_TO_DELIVER: "Lista para entregar",
  PARTIALLY_DELIVERED: "Entrega parcial",
  DELIVERED: "Entregada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada"
};

const actionLabels: Record<string, string> = {
  CREATED: "Requisicion creada",
  STATUS_CHANGED: "Estado actualizado",
  APPROVED: "Requisicion aprobada",
  REJECTED: "Requisicion rechazada",
  CANCELLED: "Requisicion cancelada",
  DELIVERED: "Requisicion entregada",
  PARTIALLY_DELIVERED: "Entrega parcial registrada",
  COMMENT_ADDED: "Comentario agregado",
  ASSIGNED: "Responsable asignado"
};

export function humanizeStatusCode(code: string) {
  return statusLabels[code] ?? code;
}

export function humanizeHistoryTitle(entry: Record<string, unknown>) {
  const statusName = recordValue<string>(entry, "newStatusName", "NewStatusName", "");
  if (statusName) return statusName;

  const action = recordValue<string>(entry, "action", "Action", "");
  return actionLabels[action] ?? "Actualizacion";
}

export function humanizeHistoryNotes(entry: Record<string, unknown>) {
  const notes = recordValue<string>(entry, "notes", "Notes", "");
  const technicalStatusMatch = notes.match(/^Estado cambiado a ([A-Z_]+)$/);

  if (technicalStatusMatch?.[1]) {
    return `Requisicion ${humanizeStatusCode(technicalStatusMatch[1]).toLowerCase()}`;
  }

  return notes || "Sin notas";
}
