import { notificationsRepository, type CreateNotificationInput } from "./notifications.repository";

export class NotificationsService {
  create(input: CreateNotificationInput) {
    return notificationsRepository.create(input);
  }

  createForRole(roleName: "Admin" | "Compras" | "Supervisor", input: Omit<CreateNotificationInput, "recipientType" | "roleId">) {
    return notificationsRepository.createForRole(roleName, input);
  }

  markRead(notificationId: number, recipient: { employeeId?: number; internalUserId?: number }) {
    return notificationsRepository.markRead(notificationId, recipient);
  }
}

export const notificationsService = new NotificationsService();
