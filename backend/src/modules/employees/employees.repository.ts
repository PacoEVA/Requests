import { getDbPool, sql } from "../../config/db";
import type { EmployeeSession, IdentifyEmployeeInput, UpdateEmployeeInput } from "./employees.types";

function mapEmployee(row: Record<string, unknown>): EmployeeSession {
  return {
    id: Number(row.Id),
    publicToken: String(row.PublicToken),
    name: String(row.Name),
    departmentId: Number(row.DepartmentId),
    departmentName: row.DepartmentName ? String(row.DepartmentName) : undefined,
    employeeCode: row.EmployeeCode ? String(row.EmployeeCode) : null,
    phoneOrExtension: row.PhoneOrExtension ? String(row.PhoneOrExtension) : null
  };
}

export class EmployeesRepository {
  async findByToken(publicToken: string) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("PublicToken", sql.UniqueIdentifier, publicToken)
      .query(`
        SELECT TOP 1 E.*, D.Name AS DepartmentName
        FROM Employees E
        INNER JOIN Departments D ON E.DepartmentId = D.Id
        WHERE E.PublicToken = @PublicToken AND E.IsActive = 1
      `);

    return result.recordset[0] ? mapEmployee(result.recordset[0]) : null;
  }

  async identify(input: IdentifyEmployeeInput) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Name", sql.NVarChar(150), input.name)
      .input("DepartmentId", sql.Int, input.departmentId)
      .input("EmployeeCode", sql.NVarChar(50), input.employeeCode ?? null)
      .input("PhoneOrExtension", sql.NVarChar(50), input.phoneOrExtension ?? null)
      .query(`
        DECLARE @EmployeeId INT;

        IF @EmployeeCode IS NOT NULL
        BEGIN
          SELECT TOP 1 @EmployeeId = Id
          FROM Employees
          WHERE EmployeeCode = @EmployeeCode;
        END

        IF @EmployeeId IS NULL
        BEGIN
          INSERT INTO Employees (Name, DepartmentId, EmployeeCode, PhoneOrExtension)
          VALUES (@Name, @DepartmentId, @EmployeeCode, @PhoneOrExtension);
          SET @EmployeeId = CONVERT(INT, SCOPE_IDENTITY());
        END
        ELSE
        BEGIN
          UPDATE Employees
          SET Name = @Name,
              DepartmentId = @DepartmentId,
              PhoneOrExtension = @PhoneOrExtension,
              UpdatedAt = SYSUTCDATETIME()
          WHERE Id = @EmployeeId;
        END

        SELECT E.*, D.Name AS DepartmentName
        FROM Employees E
        INNER JOIN Departments D ON E.DepartmentId = D.Id
        WHERE E.Id = @EmployeeId;
      `);

    return mapEmployee(result.recordset[0]);
  }

  async updateByToken(publicToken: string, input: UpdateEmployeeInput) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("PublicToken", sql.UniqueIdentifier, publicToken)
      .input("Name", sql.NVarChar(150), input.name)
      .input("DepartmentId", sql.Int, input.departmentId)
      .input("PhoneOrExtension", sql.NVarChar(50), input.phoneOrExtension ?? null)
      .query(`
        UPDATE Employees
        SET Name = @Name,
            DepartmentId = @DepartmentId,
            PhoneOrExtension = @PhoneOrExtension,
            UpdatedAt = SYSUTCDATETIME()
        WHERE PublicToken = @PublicToken AND IsActive = 1;

        SELECT E.*, D.Name AS DepartmentName
        FROM Employees E
        INNER JOIN Departments D ON E.DepartmentId = D.Id
        WHERE E.PublicToken = @PublicToken;
      `);

    return result.recordset[0] ? mapEmployee(result.recordset[0]) : null;
  }
}

export const employeesRepository = new EmployeesRepository();
