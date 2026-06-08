import { getDbPool, sql } from "../../config/db";
import type { RoleName } from "../auth/auth.types";

export interface InternalUserInput {
  username: string;
  fullName: string;
  password?: string;
  role: RoleName;
  departmentId?: number;
}

export class UsersRepository {
  async list() {
    const pool = await getDbPool();
    const result = await pool.query(`
      SELECT
        U.Id,
        U.Username,
        U.FullName,
        U.DepartmentId,
        U.IsActive,
        U.RequirePasswordChange,
        U.LastLoginAt,
        R.Name AS RoleName,
        D.Name AS DepartmentName
      FROM InternalUsers U
      INNER JOIN Roles R ON U.RoleId = R.Id
      LEFT JOIN Departments D ON U.DepartmentId = D.Id
      ORDER BY U.FullName ASC
    `);

    return result.recordset;
  }

  async create(input: Required<Pick<InternalUserInput, "password">> & InternalUserInput, passwordHash: string) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Username", sql.NVarChar(80), input.username)
      .input("FullName", sql.NVarChar(150), input.fullName)
      .input("PasswordHash", sql.NVarChar(255), passwordHash)
      .input("RoleName", sql.NVarChar(50), input.role)
      .input("DepartmentId", sql.Int, input.departmentId ?? null)
      .query(`
        DECLARE @RoleId INT;
        SELECT @RoleId = Id FROM Roles WHERE Name = @RoleName;

        INSERT INTO InternalUsers (Username, FullName, PasswordHash, RoleId, DepartmentId, RequirePasswordChange)
        OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.FullName, INSERTED.RoleId, INSERTED.DepartmentId, INSERTED.IsActive
        VALUES (@Username, @FullName, @PasswordHash, @RoleId, @DepartmentId, 1)
      `);

    return result.recordset[0];
  }

  async update(id: number, input: Omit<InternalUserInput, "password">) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .input("Username", sql.NVarChar(80), input.username)
      .input("FullName", sql.NVarChar(150), input.fullName)
      .input("RoleName", sql.NVarChar(50), input.role)
      .input("DepartmentId", sql.Int, input.departmentId ?? null)
      .query(`
        DECLARE @RoleId INT;
        SELECT @RoleId = Id FROM Roles WHERE Name = @RoleName;

        UPDATE InternalUsers
        SET Username = @Username,
            FullName = @FullName,
            RoleId = @RoleId,
            DepartmentId = @DepartmentId,
            UpdatedAt = SYSUTCDATETIME()
        OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.FullName, INSERTED.RoleId, INSERTED.DepartmentId, INSERTED.IsActive
        WHERE Id = @Id
      `);

    return result.recordset[0];
  }

  async setActive(id: number, isActive: boolean) {
    const pool = await getDbPool();
    await pool
      .request()
      .input("Id", sql.Int, id)
      .input("IsActive", sql.Bit, isActive)
      .query("UPDATE InternalUsers SET IsActive = @IsActive, UpdatedAt = SYSUTCDATETIME() WHERE Id = @Id");
  }

  async resetPassword(id: number, passwordHash: string) {
    const pool = await getDbPool();
    await pool
      .request()
      .input("Id", sql.Int, id)
      .input("PasswordHash", sql.NVarChar(255), passwordHash)
      .query(`
        UPDATE InternalUsers
        SET PasswordHash = @PasswordHash,
            RequirePasswordChange = 1,
            UpdatedAt = SYSUTCDATETIME()
        WHERE Id = @Id
      `);
  }
}

export const usersRepository = new UsersRepository();
