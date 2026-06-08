import { getDbPool, sql } from "../../config/db";
import type { InternalUserRecord } from "./auth.types";

function mapUserRecord(row: Record<string, unknown>): InternalUserRecord {
  return {
    id: Number(row.Id),
    username: String(row.Username),
    fullName: String(row.FullName),
    passwordHash: String(row.PasswordHash),
    role: row.RoleName as InternalUserRecord["role"],
    isActive: Boolean(row.IsActive),
    requirePasswordChange: Boolean(row.RequirePasswordChange)
  };
}

export class AuthRepository {
  async findByUsername(username: string) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Username", sql.NVarChar(80), username)
      .query(`
        SELECT TOP 1
          U.Id,
          U.Username,
          U.FullName,
          U.PasswordHash,
          U.IsActive,
          U.RequirePasswordChange,
          R.Name AS RoleName
        FROM InternalUsers U
        INNER JOIN Roles R ON U.RoleId = R.Id
        WHERE U.Username = @Username
      `);

    return result.recordset[0] ? mapUserRecord(result.recordset[0]) : null;
  }

  async findById(id: number) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .query(`
        SELECT TOP 1
          U.Id,
          U.Username,
          U.FullName,
          U.PasswordHash,
          U.IsActive,
          U.RequirePasswordChange,
          R.Name AS RoleName
        FROM InternalUsers U
        INNER JOIN Roles R ON U.RoleId = R.Id
        WHERE U.Id = @Id
      `);

    return result.recordset[0] ? mapUserRecord(result.recordset[0]) : null;
  }

  async updateLastLogin(id: number) {
    const pool = await getDbPool();
    await pool
      .request()
      .input("Id", sql.Int, id)
      .query("UPDATE InternalUsers SET LastLoginAt = SYSUTCDATETIME() WHERE Id = @Id");
  }

  async updatePassword(id: number, passwordHash: string, requirePasswordChange: boolean) {
    const pool = await getDbPool();
    await pool
      .request()
      .input("Id", sql.Int, id)
      .input("PasswordHash", sql.NVarChar(255), passwordHash)
      .input("RequirePasswordChange", sql.Bit, requirePasswordChange)
      .query(`
        UPDATE InternalUsers
        SET PasswordHash = @PasswordHash,
            RequirePasswordChange = @RequirePasswordChange,
            UpdatedAt = SYSUTCDATETIME()
        WHERE Id = @Id
      `);
  }
}

export const authRepository = new AuthRepository();
