export type RequisitionStatusCode =
  | "PENDING"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "IN_PURCHASE"
  | "READY_TO_DELIVER"
  | "PARTIALLY_DELIVERED"
  | "DELIVERED"
  | "CANCELLED";

export const FINAL_STATUS_CODES = new Set<RequisitionStatusCode>(["REJECTED", "DELIVERED", "CANCELLED"]);

const ALLOWED_TRANSITIONS: Record<RequisitionStatusCode, RequisitionStatusCode[]> = {
  PENDING: ["IN_REVIEW", "APPROVED", "REJECTED", "CANCELLED"],
  IN_REVIEW: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["IN_PURCHASE", "READY_TO_DELIVER", "PARTIALLY_DELIVERED", "DELIVERED"],
  REJECTED: [],
  IN_PURCHASE: ["READY_TO_DELIVER"],
  READY_TO_DELIVER: ["DELIVERED", "PARTIALLY_DELIVERED"],
  PARTIALLY_DELIVERED: ["DELIVERED", "IN_PURCHASE"],
  DELIVERED: [],
  CANCELLED: []
};

/** Verifica si un codigo pertenece al catalogo conocido de estados. */
export function isKnownStatus(code: string): code is RequisitionStatusCode {
  return code in ALLOWED_TRANSITIONS;
}

/** Indica si un estado ya no admite cambios posteriores. */
export function isFinalStatus(code: string) {
  return isKnownStatus(code) && FINAL_STATUS_CODES.has(code);
}

/** Valida que la transicion entre dos estados este permitida por negocio. */
export function canTransition(from: string, to: string) {
  if (!isKnownStatus(from) || !isKnownStatus(to)) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Permite mantener el estado actual o avanzar por una transicion valida. */
export function canStayOrTransition(from: string, to: string) {
  return from === to || canTransition(from, to);
}
