import { getDbPool, sql } from "../../config/db";
import type {
  EmployeeAuthRecord,
  EmployeeIdentityConflicts,
  EmployeeSession,
  RegisterEmployeeInput,
  UpdateEmployeeInput
} from "./employees.types";

/** Mapea una fila SQL de empleado al contrato de sesion del frontend. */
function mapEmployee(row: Record<string, unknown>): EmployeeSession {
  return {
    id: Number(row.Id),
    username: row.Usuario ? String(row.Usuario) : "",
    name: String(row.Name),
    departmentId: Number(row.DepartmentId),
    departmentName: row.DepartmentName ? String(row.DepartmentName) : undefined,
    employeeCode: row.EmployeeCode ? String(row.EmployeeCode) : null,
    phoneOrExtension: row.PhoneOrExtension ? String(row.PhoneOrExtension) : null,
    email: row.Correo ? String(row.Correo) : null
  };
}

/** Agrega los campos privados que solo se usan para validar el inicio de sesion. */
function mapAuthEmployee(row: Record<string, unknown>): EmployeeAuthRecord {
  return {
    ...mapEmployee(row),
    passwordHash: row.PasswordHash ? String(row.PasswordHash) : "",
    isActive: Boolean(row.IsActive)
  };
}

export class EmployeesRepository {
  /** Lista cuentas de empleados sin exponer hashes ni tokens heredados. */
  async listForAdmin() {
    const pool = await getDbPool();
    const result = await pool.query(`
      SELECT
        E.Id,
        E.Name,
        E.EmployeeCode,
        E.PhoneOrExtension,
        E.Correo,
        E.Usuario,
        E.IsActive,
        E.LastLoginAt,
        E.CreatedAt,
        D.Name AS DepartmentName,
        CONVERT(BIT, CASE WHEN E.Usuario IS NOT NULL AND E.PasswordHash IS NOT NULL THEN 1 ELSE 0 END) AS HasCredentials
      FROM Employees E
      INNER JOIN Departments D ON E.DepartmentId = D.Id
      ORDER BY E.Name ASC;
    `);

    return result.recordset;
  }

  /** Busca las credenciales de un empleado por usuario. */
  async findByUsername(username: string) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Usuario", sql.NVarChar(80), username)
      .query(`
        SELECT TOP 1 E.*, D.Name AS DepartmentName
        FROM Employees E
        INNER JOIN Departments D ON E.DepartmentId = D.Id
        WHERE E.Usuario = @Usuario
      `);

    return result.recordset[0] ? mapAuthEmployee(result.recordset[0]) : null;
  }

  /** Localiza un registro legado que aun no tiene credenciales para evitar duplicarlo. */
  async findUnprovisionedByEmployeeCode(employeeCode: string) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("EmployeeCode", sql.NVarChar(50), employeeCode)
      .query(`
        SELECT TOP 1 E.*, D.Name AS DepartmentName
        FROM Employees E
        INNER JOIN Departments D ON E.DepartmentId = D.Id
        WHERE E.EmployeeCode = @EmployeeCode
          AND E.IsActive = 1
          AND E.Usuario IS NULL
          AND E.PasswordHash IS NULL;
      `);

    return result.recordset[0] ? mapEmployee(result.recordset[0]) : null;
  }

  /** Consulta en DB si codigo, correo o usuario ya pertenecen a otro empleado. */
  async findIdentityConflicts(
    values: { employeeCode?: string | null; email?: string | null; username?: string | null },
    excludeEmployeeId?: number
  ): Promise<EmployeeIdentityConflicts> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("EmployeeCode", sql.NVarChar(50), values.employeeCode ?? null)
      .input("Correo", sql.NVarChar(255), values.email ?? null)
      .input("Usuario", sql.NVarChar(80), values.username ?? null)
      .input("ExcludeEmployeeId", sql.Int, excludeEmployeeId ?? null)
      .query(`
        SELECT
          CONVERT(BIT, CASE WHEN @EmployeeCode IS NOT NULL AND EXISTS (
            SELECT 1 FROM Employees
            WHERE EmployeeCode = @EmployeeCode
              AND (@ExcludeEmployeeId IS NULL OR Id <> @ExcludeEmployeeId)
          ) THEN 1 ELSE 0 END) AS EmployeeCodeExists,
          CONVERT(BIT, CASE WHEN @Correo IS NOT NULL AND EXISTS (
            SELECT 1 FROM Employees
            WHERE Correo = @Correo
              AND (@ExcludeEmployeeId IS NULL OR Id <> @ExcludeEmployeeId)
          ) THEN 1 ELSE 0 END) AS CorreoExists,
          CONVERT(BIT, CASE WHEN @Usuario IS NOT NULL AND EXISTS (
            SELECT 1 FROM Employees
            WHERE Usuario = @Usuario
              AND (@ExcludeEmployeeId IS NULL OR Id <> @ExcludeEmployeeId)
          ) THEN 1 ELSE 0 END) AS UsuarioExists;
      `);

    const row = result.recordset[0];
    return {
      employeeCode: Boolean(row.EmployeeCodeExists),
      email: Boolean(row.CorreoExists),
      username: Boolean(row.UsuarioExists)
    };
  }

  /** Crea un empleado con sus credenciales ya protegidas por hash. */
  async create(input: RegisterEmployeeInput, passwordHash: string) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Name", sql.NVarChar(150), input.name)
      .input("DepartmentId", sql.Int, input.departmentId)
      .input("EmployeeCode", sql.NVarChar(50), input.employeeCode)
      .input("PhoneOrExtension", sql.NVarChar(50), input.phoneOrExtension)
      .input("Correo", sql.NVarChar(255), input.email)
      .input("Usuario", sql.NVarChar(80), input.username)
      .input("PasswordHash", sql.NVarChar(255), passwordHash)
      .query(`
        INSERT INTO Employees
          (Name, DepartmentId, EmployeeCode, PhoneOrExtension, Correo, Usuario, PasswordHash)
        VALUES
          (@Name, @DepartmentId, @EmployeeCode, @PhoneOrExtension, @Correo, @Usuario, @PasswordHash);

        DECLARE @EmployeeId INT = CONVERT(INT, SCOPE_IDENTITY());

        SELECT E.*, D.Name AS DepartmentName
        FROM Employees E
        INNER JOIN Departments D ON E.DepartmentId = D.Id
        WHERE E.Id = @EmployeeId;
      `);

    return mapEmployee(result.recordset[0]);
  }

  /** Completa las credenciales de un empleado creado antes del nuevo login. */
  async provisionCredentials(employeeId: number, input: RegisterEmployeeInput, passwordHash: string) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("EmployeeId", sql.Int, employeeId)
      .input("Name", sql.NVarChar(150), input.name)
      .input("DepartmentId", sql.Int, input.departmentId)
      .input("PhoneOrExtension", sql.NVarChar(50), input.phoneOrExtension)
      .input("Correo", sql.NVarChar(255), input.email)
      .input("Usuario", sql.NVarChar(80), input.username)
      .input("PasswordHash", sql.NVarChar(255), passwordHash)
      .query(`
        UPDATE Employees
        SET Name = @Name,
            DepartmentId = @DepartmentId,
            PhoneOrExtension = @PhoneOrExtension,
            Correo = @Correo,
            Usuario = @Usuario,
            PasswordHash = @PasswordHash,
            UpdatedAt = SYSUTCDATETIME()
        WHERE Id = @EmployeeId
          AND IsActive = 1
          AND Usuario IS NULL
          AND PasswordHash IS NULL;

        SELECT E.*, D.Name AS DepartmentName
        FROM Employees E
        INNER JOIN Departments D ON E.DepartmentId = D.Id
        WHERE E.Id = @EmployeeId
          AND E.Usuario = @Usuario;
      `);

    return result.recordset[0] ? mapEmployee(result.recordset[0]) : null;
  }

  /** Actualiza el perfil del empleado autenticado por su id incluido en el JWT. */
  async updateById(employeeId: number, input: UpdateEmployeeInput) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("EmployeeId", sql.Int, employeeId)
      .input("Name", sql.NVarChar(150), input.name)
      .input("DepartmentId", sql.Int, input.departmentId)
      .input("PhoneOrExtension", sql.NVarChar(50), input.phoneOrExtension ?? null)
      .input("Correo", sql.NVarChar(255), input.email ?? null)
      .query(`
        UPDATE Employees
        SET Name = @Name,
            DepartmentId = @DepartmentId,
            PhoneOrExtension = @PhoneOrExtension,
            Correo = @Correo,
            UpdatedAt = SYSUTCDATETIME()
        WHERE Id = @EmployeeId AND IsActive = 1;

        SELECT E.*, D.Name AS DepartmentName
        FROM Employees E
        INNER JOIN Departments D ON E.DepartmentId = D.Id
        WHERE E.Id = @EmployeeId;
      `);

    return result.recordset[0] ? mapEmployee(result.recordset[0]) : null;
  }

  /** Consulta un empleado por su id. */
  async getById(id: number) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .query(`
        SELECT E.*, D.Name AS DepartmentName
        FROM Employees E
        INNER JOIN Departments D ON E.DepartmentId = D.Id
        WHERE E.Id = @Id AND E.IsActive = 1;
      `);

    return result.recordset[0] ? mapEmployee(result.recordset[0]) : null;
  }

  /** Registra la fecha del ultimo inicio de sesion valido. */
  async updateLastLogin(id: number) {
    const pool = await getDbPool();
    await pool
      .request()
      .input("Id", sql.Int, id)
      .query("UPDATE Employees SET LastLoginAt = SYSUTCDATETIME() WHERE Id = @Id");
  }

  /** Cambia el estado de la cuenta y devuelve si el empleado existia. */
  async setActive(id: number, isActive: boolean) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .input("IsActive", sql.Bit, isActive)
      .query(`
        UPDATE Employees
        SET IsActive = @IsActive,
            UpdatedAt = SYSUTCDATETIME()
        OUTPUT INSERTED.Id
        WHERE Id = @Id;
      `);

    return Boolean(result.recordset[0]);
  }
}

export const employeesRepository = new EmployeesRepository();
