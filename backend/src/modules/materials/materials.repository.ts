import { getDbPool, sql } from "../../config/db";

export interface MaterialInput {
  name: string;
  itemCode?: string;
  description?: string;
  isRequestable?: boolean;
}

export class MaterialsRepository {
  async listPublic(search?: string) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Search", sql.NVarChar(200), search ? `%${search}%` : null)
      .query(`
        SELECT Id, ItemCode, Name, Description
        FROM Materials
        WHERE IsActive = 1
          AND IsRequestable = 1
          AND (@Search IS NULL OR Name LIKE @Search OR ItemCode LIKE @Search)
        ORDER BY Name ASC
      `);

    return result.recordset;
  }

  async listAdmin(search?: string) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Search", sql.NVarChar(200), search ? `%${search}%` : null)
      .query(`
        SELECT *
        FROM Materials
        WHERE @Search IS NULL OR Name LIKE @Search OR ItemCode LIKE @Search
        ORDER BY Name ASC
      `);

    return result.recordset;
  }

  async create(input: MaterialInput) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Name", sql.NVarChar(200), input.name)
      .input("ItemCode", sql.NVarChar(80), input.itemCode ?? null)
      .input("Description", sql.NVarChar(500), input.description ?? null)
      .input("IsRequestable", sql.Bit, input.isRequestable ?? true)
      .query(`
        INSERT INTO Materials (ItemCode, Name, Description, IsRequestable)
        OUTPUT INSERTED.*
        VALUES (@ItemCode, @Name, @Description, @IsRequestable)
      `);

    return result.recordset[0];
  }

  async update(id: number, input: MaterialInput) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .input("Name", sql.NVarChar(200), input.name)
      .input("ItemCode", sql.NVarChar(80), input.itemCode ?? null)
      .input("Description", sql.NVarChar(500), input.description ?? null)
      .input("IsRequestable", sql.Bit, input.isRequestable ?? true)
      .query(`
        UPDATE Materials
        SET ItemCode = @ItemCode,
            Name = @Name,
            Description = @Description,
            IsRequestable = @IsRequestable,
            UpdatedAt = SYSUTCDATETIME()
        OUTPUT INSERTED.*
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
      .query("UPDATE Materials SET IsActive = @IsActive, UpdatedAt = SYSUTCDATETIME() WHERE Id = @Id");
  }
}

export const materialsRepository = new MaterialsRepository();
