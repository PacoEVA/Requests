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
    const roleResult = await pool
      .request()
      .input("RoleName", sql.NVarChar(50), roleName)
      .query("SELECT TOP 1 Id FROM Roles WHERE Name = @RoleName");

    const roleId = roleResult.recordset[0]?.Id;
    if (!roleId) return null;

    return this.create({
      ...input,
      recipientType: "ROLE",
      roleId: Number(roleId)
    });
  }

  async markRead(notificationId: number, recipient: { employeeId?: number; internalUserId?: number }) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Id", sql.Int, notificationId)
      .input("EmployeeId", sql.Int, recipient.employeeId ?? null)
      .input("InternalUserId", sql.Int, recipient.internalUserId ?? null)
      .query(`
        UPDATE Notifications
        SET IsRead = 1,
            ReadAt = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE Id = @Id
          AND (
            (@EmployeeId IS NOT NULL AND EmployeeId = @EmployeeId)
            OR (@InternalUserId IS NOT NULL AND InternalUserId = @InternalUserId)
            OR RecipientType = 'ROLE'
          )
      `);

    return result.recordset[0] ?? null;
  }
}

export const notificationsRepository = new NotificationsRepository();
