export function friendlyErrorMessage(error: unknown, fallback = "No se pudo completar la accion.") {
  if (error instanceof Error && error.message.trim()) {
    return normalizeMessage(error.message);
  }

  if (typeof error === "string" && error.trim()) {
    return normalizeMessage(error);
  }

  return fallback;
}

export function normalizeMessage(message: string) {
  const text = message.trim();

  if (!text || text === "Failed to fetch" || text.includes("NetworkError")) {
    return "No se pudo conectar con el servidor. Revise que el backend este ejecutandose e intente nuevamente.";
  }

  if (text.includes("Unexpected token") || text.includes("JSON")) {
    return "El servidor respondio de una forma inesperada. Intente nuevamente.";
  }

  return text;
}

export function apiStatusMessage(status: number, message?: string) {
  const normalized = message ? normalizeMessage(message) : "";
  if (normalized) return normalized;

  if (status === 400) return "Revise los datos ingresados e intente nuevamente.";
  if (status === 401) return "Su sesion expiro o no ha iniciado sesion.";
  if (status === 403) return "No tiene permiso para realizar esta accion.";
  if (status === 404) return "No se encontro la informacion solicitada.";
  if (status === 409) return "La accion no se puede completar por el estado actual del registro.";
  if (status >= 500) return "Ocurrio un problema en el servidor. Intente nuevamente mas tarde.";

  return "No se pudo completar la operacion.";
}
