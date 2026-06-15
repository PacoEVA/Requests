import { apiRequest } from "./api";

export interface NotificationCredentials {
  token?: string | null;
  employeeToken?: string | null;
}

export interface NotificationRecord {
  Id?: number;
  id?: number;
  Title?: string;
  title?: string;
  Message?: string;
  message?: string;
  Type?: string;
  type?: string;
  RequisitionId?: number | null;
  requisitionId?: number | null;
  CreatedAt?: string;
  createdAt?: string;
}

export const notificationService = {
  /** Obtiene las notificaciones pendientes del usuario o empleado autenticado. */
  unread(credentials: NotificationCredentials) {
    return apiRequest<{ notifications: NotificationRecord[] }>("/notifications/unread", credentials);
  },
  /** Marca una notificacion concreta como leida en el backend. */
  markRead(credentials: NotificationCredentials, notificationId: number) {
    return apiRequest<{ notification: NotificationRecord }>(`/notifications/${notificationId}/read`, {
      ...credentials,
      method: "PATCH"
    });
  }
};
