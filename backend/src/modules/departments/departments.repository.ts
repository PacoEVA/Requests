import { getDbPool, sql } from "../../config/db";

export interface DepartmentInput {
  name: string;
  description?: string;
}

export class DepartmentsRepository {
  /** Consulta departamentos ordenados por nombre, filtrando activos si se solicita. */
  async list(publicOnly = false) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("PublicOnly", sql.Bit, publicOnly)
      .query(`
        SELECT *
        FROM Departments
        WHERE @PublicOnly = 0 OR IsActive = 1
        ORDER BY Name ASC
      `);

    return result.recordset;
  }

  /** Inserta un departamento y devuelve el registro creado. */
  async create(input: DepartmentInput) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Name", sql.NVarChar(150), input.name)
      .input("Description", sql.NVarChar(300), input.description ?? null)
      .query(`
        INSERT INTO Departments (Name, Description)
        OUTPUT INSERTED.*
        VALUES (@Name, @Description)
      `);

    return result.recordset[0];
  }

  /** Actualiza datos basicos de un departamento y devuelve el registro actualizado. */
  async update(id: number, input: DepartmentInput) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .input("Name", sql.NVarChar(150), input.name)
      .input("Description", sql.NVarChar(300), input.description ?? null)
      .query(`
        UPDATE Departments
        SET Name = @Name, Description = @Description, UpdatedAt = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE Id = @Id
      `);

    return result.recordset[0];
  }

  /** Marca un departamento como activo o inactivo. */
  async setActive(id: number, isActive: boolean) {
    const pool = await getDbPool();
    await pool
      .request()
      .input("Id", sql.Int, id)
      .input("IsActive", sql.Bit, isActive)
      .query("UPDATE Departments SET IsActive = @IsActive, UpdatedAt = SYSUTCDATETIME() WHERE Id = @Id");
  }
}

export const departmentsRepository = new DepartmentsRepository();
