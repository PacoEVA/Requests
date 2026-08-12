import { getDbPool, sql } from "../../config/db";
import type { RoleName } from "../auth/auth.types";

export interface InternalUserInput {
  username: string;
  fullName: string;
  email: string;
  password?: string;
  role: RoleName;
  departmentId?: number;
}

export interface InternalUserIdentityConflicts {
  username: boolean;
  email: boolean;
}

export class UsersRepository {
  /** Comprueba si usuario o correo pertenecen a otra cuenta interna. */
  async findIdentityConflicts(
    values: Pick<InternalUserInput, "username" | "email">,
    excludeUserId?: number
  ): Promise<InternalUserIdentityConflicts> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Username", sql.NVarChar(80), values.username)
      .input("Correo", sql.NVarChar(255), values.email)
      .input("ExcludeUserId", sql.Int, excludeUserId ?? null)
      .query(`
        SELECT
          CONVERT(BIT, CASE WHEN EXISTS (
            SELECT 1
            FROM InternalUsers
            WHERE Username = @Username
              AND (@ExcludeUserId IS NULL OR Id <> @ExcludeUserId)
          ) THEN 1 ELSE 0 END) AS UsernameExists,
          CONVERT(BIT, CASE WHEN EXISTS (
            SELECT 1
            FROM InternalUsers
            WHERE Correo = @Correo
              AND (@ExcludeUserId IS NULL OR Id <> @ExcludeUserId)
          ) THEN 1 ELSE 0 END) AS CorreoExists;
      `);

    const row = result.recordset[0];
    return {
      username: Boolean(row.UsernameExists),
      email: Boolean(row.CorreoExists)
    };
  }

  /** Consulta usuarios internos con rol y departamento asociado. */
  async list() {
    const pool = await getDbPool();
    const result = await pool.query(`
      SELECT
        U.Id,
        U.Username,
        U.FullName,
        U.Correo,
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

  /** Inserta un usuario interno con hash de contrasena y cambio obligatorio. */
  async create(input: Required<Pick<InternalUserInput, "password">> & InternalUserInput, passwordHash: string) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Username", sql.NVarChar(80), input.username)
      .input("FullName", sql.NVarChar(150), input.fullName)
      .input("Correo", sql.NVarChar(255), input.email)
      .input("PasswordHash", sql.NVarChar(255), passwordHash)
      .input("RoleName", sql.NVarChar(50), input.role)
      .input("DepartmentId", sql.Int, input.departmentId ?? null)
      .query(`
        DECLARE @RoleId INT;
        SELECT @RoleId = Id FROM Roles WHERE Name = @RoleName;

        INSERT INTO InternalUsers (Username, FullName, Correo, PasswordHash, RoleId, DepartmentId, RequirePasswordChange)
        OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.FullName, INSERTED.Correo, INSERTED.RoleId, INSERTED.DepartmentId, INSERTED.IsActive
        VALUES (@Username, @FullName, @Correo, @PasswordHash, @RoleId, @DepartmentId, 1)
      `);

    return result.recordset[0];
  }

  /** Actualiza nombre, rol y departamento de un usuario interno. */
  async update(id: number, input: Omit<InternalUserInput, "password">) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .input("Username", sql.NVarChar(80), input.username)
      .input("FullName", sql.NVarChar(150), input.fullName)
      .input("Correo", sql.NVarChar(255), input.email)
      .input("RoleName", sql.NVarChar(50), input.role)
      .input("DepartmentId", sql.Int, input.departmentId ?? null)
      .query(`
        DECLARE @RoleId INT;
        SELECT @RoleId = Id FROM Roles WHERE Name = @RoleName;

        UPDATE InternalUsers
        SET Username = @Username,
            FullName = @FullName,
            Correo = @Correo,
            RoleId = @RoleId,
            DepartmentId = @DepartmentId,
            UpdatedAt = SYSUTCDATETIME()
        OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.FullName, INSERTED.Correo, INSERTED.RoleId, INSERTED.DepartmentId, INSERTED.IsActive
        WHERE Id = @Id
      `);

    return result.recordset[0];
  }

  /** Marca un usuario interno como activo o inactivo. */
  async setActive(id: number, isActive: boolean) {
    const pool = await getDbPool();
    await pool
      .request()
      .input("Id", sql.Int, id)
      .input("IsActive", sql.Bit, isActive)
      .query("UPDATE InternalUsers SET IsActive = @IsActive, UpdatedAt = SYSUTCDATETIME() WHERE Id = @Id");
  }

  /** Guarda un hash temporal y fuerza cambio de contrasena en el proximo acceso. */
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

  async getById(id: number) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .query(`
        SELECT
          U.Id,
          U.Username,
          U.FullName,
          U.Correo,
          U.DepartmentId,
          U.IsActive,
          U.RequirePasswordChange,
          U.LastLoginAt,
          R.Name AS RoleName,
          D.Name AS DepartmentName
        FROM InternalUsers U
        INNER JOIN Roles R ON U.RoleId = R.Id
        LEFT JOIN Departments D ON U.DepartmentId = D.Id
        WHERE U.Id = @Id
      `);
      
    return result.recordset[0] || null;
  }

  /** Devuelve destinatarios activos de los roles que gestionan compras. */
  async listActivePurchasingEmailRecipients() {
    const pool = await getDbPool();
    const result = await pool.query(`
      SELECT U.Id, U.FullName, U.Correo, R.Name AS RoleName
      FROM InternalUsers U
      INNER JOIN Roles R ON U.RoleId = R.Id
      WHERE U.IsActive = 1
        AND U.Correo IS NOT NULL
        AND LTRIM(RTRIM(U.Correo)) <> ''
        AND R.Name IN ('Admin', 'Compras')
      ORDER BY U.FullName ASC;
    `);

    return result.recordset;
  }

}

export const usersRepository = new UsersRepository();
