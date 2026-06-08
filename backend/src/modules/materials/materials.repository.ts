import { getDbPool, sql } from "../../config/db";

export interface MaterialInput {
  name: string;
  description?: string;
  categoryId?: number;
  unitOfMeasure?: string;
  isRequestable?: boolean;
}

export interface MaterialCategoryInput {
  name: string;
  description?: string;
}

export class MaterialsRepository {
  async listPublic(search?: string) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Search", sql.NVarChar(200), search ? `%${search}%` : null)
      .query(`
        SELECT Id, Name, Description, CategoryId, UnitOfMeasure
        FROM Materials
        WHERE IsActive = 1
          AND IsRequestable = 1
          AND (@Search IS NULL OR Name LIKE @Search)
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
        SELECT M.*, C.Name AS CategoryName
        FROM Materials M
        LEFT JOIN MaterialCategories C ON M.CategoryId = C.Id
        WHERE @Search IS NULL OR M.Name LIKE @Search
        ORDER BY M.Name ASC
      `);

    return result.recordset;
  }

  async create(input: MaterialInput) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Name", sql.NVarChar(200), input.name)
      .input("Description", sql.NVarChar(500), input.description ?? null)
      .input("CategoryId", sql.Int, input.categoryId ?? null)
      .input("UnitOfMeasure", sql.NVarChar(50), input.unitOfMeasure ?? null)
      .input("IsRequestable", sql.Bit, input.isRequestable ?? true)
      .query(`
        INSERT INTO Materials (Name, Description, CategoryId, UnitOfMeasure, IsRequestable)
        OUTPUT INSERTED.*
        VALUES (@Name, @Description, @CategoryId, @UnitOfMeasure, @IsRequestable)
      `);

    return result.recordset[0];
  }

  async update(id: number, input: MaterialInput) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .input("Name", sql.NVarChar(200), input.name)
      .input("Description", sql.NVarChar(500), input.description ?? null)
      .input("CategoryId", sql.Int, input.categoryId ?? null)
      .input("UnitOfMeasure", sql.NVarChar(50), input.unitOfMeasure ?? null)
      .input("IsRequestable", sql.Bit, input.isRequestable ?? true)
      .query(`
        UPDATE Materials
        SET Name = @Name,
            Description = @Description,
            CategoryId = @CategoryId,
            UnitOfMeasure = @UnitOfMeasure,
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

  async listCategories(publicOnly = false) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("PublicOnly", sql.Bit, publicOnly)
      .query(`
        SELECT *
        FROM MaterialCategories
        WHERE @PublicOnly = 0 OR IsActive = 1
        ORDER BY Name ASC
      `);

    return result.recordset;
  }

  async createCategory(input: MaterialCategoryInput) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Name", sql.NVarChar(150), input.name)
      .input("Description", sql.NVarChar(300), input.description ?? null)
      .query(`
        INSERT INTO MaterialCategories (Name, Description)
        OUTPUT INSERTED.*
        VALUES (@Name, @Description)
      `);

    return result.recordset[0];
  }

  async updateCategory(id: number, input: MaterialCategoryInput) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .input("Name", sql.NVarChar(150), input.name)
      .input("Description", sql.NVarChar(300), input.description ?? null)
      .query(`
        UPDATE MaterialCategories
        SET Name = @Name, Description = @Description, UpdatedAt = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE Id = @Id
      `);

    return result.recordset[0];
  }

  async setCategoryActive(id: number, isActive: boolean) {
    const pool = await getDbPool();
    await pool
      .request()
      .input("Id", sql.Int, id)
      .input("IsActive", sql.Bit, isActive)
      .query("UPDATE MaterialCategories SET IsActive = @IsActive, UpdatedAt = SYSUTCDATETIME() WHERE Id = @Id");
  }
}

export const materialsRepository = new MaterialsRepository();
