import { getDbPool, sql } from "../../config/db";

export class InventoryRepository {
  async list() {
    const pool = await getDbPool();
    const result = await pool.query(`
      SELECT
        I.*,
        M.Name AS MaterialName,
        M.UnitOfMeasure
      FROM Inventory I
      INNER JOIN Materials M ON I.MaterialId = M.Id
      ORDER BY M.Name ASC
    `);

    return result.recordset;
  }

  async lowStock() {
    const pool = await getDbPool();
    const result = await pool.query(`
      SELECT I.*, M.Name AS MaterialName, M.UnitOfMeasure
      FROM Inventory I
      INNER JOIN Materials M ON I.MaterialId = M.Id
      WHERE I.AvailableStock <= I.MinimumStock
      ORDER BY M.Name ASC
    `);

    return result.recordset;
  }

  async updateMinimumStock(materialId: number, minimumStock: number) {
    const pool = await getDbPool();
    await pool
      .request()
      .input("MaterialId", sql.Int, materialId)
      .input("MinimumStock", sql.Decimal(18, 4), minimumStock)
      .query(`
        UPDATE Inventory
        SET MinimumStock = @MinimumStock, UpdatedAt = SYSUTCDATETIME()
        WHERE MaterialId = @MaterialId
      `);
  }

  async adjust(materialId: number, quantity: number, userId: number, notes?: string) {
    const pool = await getDbPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const current = await new sql.Request(transaction)
        .input("MaterialId", sql.Int, materialId)
        .query("SELECT TOP 1 CurrentStock FROM Inventory WHERE MaterialId = @MaterialId");

      const previousStock = Number(current.recordset[0]?.CurrentStock ?? 0);
      const newStock = previousStock + quantity;

      await new sql.Request(transaction)
        .input("MaterialId", sql.Int, materialId)
        .input("NewStock", sql.Decimal(18, 4), newStock)
        .query(`
          UPDATE Inventory
          SET CurrentStock = @NewStock, UpdatedAt = SYSUTCDATETIME()
          WHERE MaterialId = @MaterialId
        `);

      await new sql.Request(transaction)
        .input("MaterialId", sql.Int, materialId)
        .input("Quantity", sql.Decimal(18, 4), quantity)
        .input("PreviousStock", sql.Decimal(18, 4), previousStock)
        .input("NewStock", sql.Decimal(18, 4), newStock)
        .input("CreatedByUserId", sql.Int, userId)
        .input("Notes", sql.NVarChar(500), notes ?? null)
        .query(`
          INSERT INTO InventoryMovements
            (MaterialId, MovementType, Quantity, PreviousStock, NewStock, ReferenceType, CreatedByUserId, Notes)
          VALUES
            (@MaterialId, 'ADJUSTMENT', @Quantity, @PreviousStock, @NewStock, 'MANUAL', @CreatedByUserId, @Notes)
        `);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async movements() {
    const pool = await getDbPool();
    const result = await pool.query(`
      SELECT TOP 200 IM.*, M.Name AS MaterialName, U.FullName AS CreatedByName
      FROM InventoryMovements IM
      INNER JOIN Materials M ON IM.MaterialId = M.Id
      LEFT JOIN InternalUsers U ON IM.CreatedByUserId = U.Id
      ORDER BY IM.CreatedAt DESC
    `);

    return result.recordset;
  }
}

export const inventoryRepository = new InventoryRepository();
