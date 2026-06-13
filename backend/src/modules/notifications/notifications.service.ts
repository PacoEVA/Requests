import { notificationsRepository, type CreateNotificationInput, type NotificationRecipient } from "./notifications.repository";

export class NotificationsService {
  create(input: CreateNotificationInput) {
    return notificationsRepository.create(input);
  }

  createForRole(roleName: "Admin" | "Compras" | "Supervisor", input: Omit<CreateNotificationInput, "recipientType" | "roleId">) {
    return notificationsRepository.createForRole(roleName, input);
  }

  listUnread(recipient: NotificationRecipient) {
    return notificationsRepository.listUnread(recipient);
  }

  markRead(notificationId: number, recipient: NotificationRecipient) {
    return notificationsRepository.markRead(notificationId, recipient);
  }
}

export const notificationsService = new NotificationsService();
