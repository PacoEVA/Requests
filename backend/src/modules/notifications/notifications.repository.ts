import { getDbPool, sql } from "../../config/db";

export interface CreateNotificationInput {
  recipientType: "EMPLOYEE" | "INTERNAL_USER" | "ROLE";
  employeeId?: number;
  internalUserId?: number;
  roleId?: number;
  requisitionId?: number;
  title: string;
  message: string;
  type: string;
}

export interface NotificationRecipient {
  employeeId?: number;
  internalUserId?: number;
  roleName?: string;
}

export class NotificationsRepository {
  async create(input: CreateNotificationInput) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("RecipientType", sql.NVarChar(20), input.recipientType)
      .input("EmployeeId", sql.Int, input.employeeId ?? null)
      .input("InternalUserId", sql.Int, input.internalUserId ?? null)
      .input("RoleId", sql.Int, input.roleId ?? null)
      .input("RequisitionId", sql.Int, input.requisitionId ?? null)
      .input("Title", sql.NVarChar(150), input.title)
      .input("Message", sql.NVarChar(500), input.message)
      .input("Type", sql.NVarChar(50), input.type)
      .query(`
        INSERT INTO Notifications
          (RecipientType, EmployeeId, InternalUserId, RoleId, RequisitionId, Title, Message, Type)
        OUTPUT INSERTED.*
        VALUES
          (@RecipientType, @EmployeeId, @InternalUserId, @RoleId, @RequisitionId, @Title, @Message, @Type)
      `);

    return result.recordset[0];
  }

  async createForRole(roleName: "Admin" | "Compras" | "Supervisor", input: Omit<CreateNotificationInput, "recipientType" | "roleId">) {
    const pool = await getDbPool();
    const usersResult = await pool
      .request()
      .input("RoleName", sql.NVarChar(50), roleName)
      .query(`
        SELECT iu.Id AS InternalUserId
        FROM InternalUsers iu
        INNER JOIN Roles r ON r.Id = iu.RoleId
        WHERE r.Name = @RoleName
          AND iu.IsActive = 1
      `);

    if (usersResult.recordset.length === 0) return [];

    return Promise.all(
      usersResult.recordset.map((user) =>
        this.create({
          ...input,
          recipientType: "INTERNAL_USER",
          internalUserId: Number(user.InternalUserId)
        })
      )
    );
  }

  async listUnread(recipient: NotificationRecipient) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("EmployeeId", sql.Int, recipient.employeeId ?? null)
      .input("InternalUserId", sql.Int, recipient.internalUserId ?? null)
      .input("RoleName", sql.NVarChar(50), recipient.roleName ?? null)
      .query(`
        SELECT TOP 50 n.*
        FROM Notifications n
        LEFT JOIN Roles r ON r.Id = n.RoleId
        WHERE n.IsRead = 0
          AND (
            (@EmployeeId IS NOT NULL AND n.EmployeeId = @EmployeeId)
            OR (@InternalUserId IS NOT NULL AND n.InternalUserId = @InternalUserId)
            OR (@RoleName IS NOT NULL AND n.RecipientType = 'ROLE' AND r.Name = @RoleName)
          )
        ORDER BY n.CreatedAt DESC
      `);

    return result.recordset;
  }

  async markRead(notificationId: number, recipient: NotificationRecipient) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Id", sql.Int, notificationId)
      .input("EmployeeId", sql.Int, recipient.employeeId ?? null)
      .input("InternalUserId", sql.Int, recipient.internalUserId ?? null)
      .input("RoleName", sql.NVarChar(50), recipient.roleName ?? null)
      .query(`
        UPDATE n
        SET IsRead = 1,
            ReadAt = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        FROM Notifications n
        LEFT JOIN Roles r ON r.Id = n.RoleId
        WHERE n.Id = @Id
          AND (
            (@EmployeeId IS NOT NULL AND n.EmployeeId = @EmployeeId)
            OR (@InternalUserId IS NOT NULL AND n.InternalUserId = @InternalUserId)
            OR (@RoleName IS NOT NULL AND n.RecipientType = 'ROLE' AND r.Name = @RoleName)
          )
      `);

    return result.recordset[0] ?? null;
  }
}

export const notificationsRepository = new NotificationsRepository();
