import { notificationsRepository, type CreateNotificationInput, type NotificationRecipient } from "./notifications.repository";

export class NotificationsService {
  /** Crea una notificacion para empleado, usuario interno o rol. */
  create(input: CreateNotificationInput) {
    return notificationsRepository.create(input);
  }

  /** Crea notificaciones individuales para todos los usuarios activos del rol. */
  createForRole(roleName: "Admin" | "Compras" | "Supervisor", input: Omit<CreateNotificationInput, "recipientType" | "roleId">) {
    return notificationsRepository.createForRole(roleName, input);
  }

  /** Devuelve las notificaciones pendientes del destinatario autenticado. */
  listUnread(recipient: NotificationRecipient) {
    return notificationsRepository.listUnread(recipient);
  }

  /** Marca una notificacion como leida si el destinatario tiene acceso. */
  markRead(notificationId: number, recipient: NotificationRecipient) {
    return notificationsRepository.markRead(notificationId, recipient);
  }
}

export const notificationsService = new NotificationsService();
