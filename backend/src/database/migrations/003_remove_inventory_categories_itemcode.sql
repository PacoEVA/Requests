SET XACT_ABORT ON;
BEGIN TRANSACTION;

/* 1. Remove local inventory support. */
IF OBJECT_ID(N'dbo.InventoryMovements', N'U') IS NOT NULL
BEGIN
  DROP TABLE dbo.InventoryMovements;
END;

IF OBJECT_ID(N'dbo.Inventory', N'U') IS NOT NULL
BEGIN
  DROP TABLE dbo.Inventory;
END;

/* 2. Remove material categories. Drop unknown FK names safely first. */
DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql = @sql + N'
ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(fk.parent_object_id)) + N'.' + QUOTENAME(OBJECT_NAME(fk.parent_object_id)) +
N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';'
FROM sys.foreign_keys fk
WHERE fk.referenced_object_id = OBJECT_ID(N'dbo.MaterialCategories')
   OR (
     fk.parent_object_id = OBJECT_ID(N'dbo.Materials')
     AND EXISTS (
       SELECT 1
       FROM sys.foreign_key_columns fkc
       WHERE fkc.constraint_object_id = fk.object_id
         AND fkc.parent_column_id = COLUMNPROPERTY(OBJECT_ID(N'dbo.Materials'), N'CategoryId', 'ColumnId')
     )
   );

IF @sql <> N''
BEGIN
  EXEC sys.sp_executesql @sql;
END;

IF OBJECT_ID(N'dbo.Materials', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.Materials', N'CategoryId') IS NOT NULL
BEGIN
  ALTER TABLE dbo.Materials DROP COLUMN CategoryId;
END;

IF OBJECT_ID(N'dbo.MaterialCategories', N'U') IS NOT NULL
BEGIN
  DROP TABLE dbo.MaterialCategories;
END;

/* 3. Update materials: remove units and add ItemCode. */
IF OBJECT_ID(N'dbo.Materials', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.Materials', N'UnitOfMeasure') IS NOT NULL
BEGIN
  ALTER TABLE dbo.Materials DROP COLUMN UnitOfMeasure;
END;

IF OBJECT_ID(N'dbo.RequisitionItems', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.RequisitionItems', N'UnitOfMeasure') IS NOT NULL
BEGIN
  ALTER TABLE dbo.RequisitionItems DROP COLUMN UnitOfMeasure;
END;

IF OBJECT_ID(N'dbo.Materials', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.Materials', N'ItemCode') IS NULL
BEGIN
  ALTER TABLE dbo.Materials ADD ItemCode NVARCHAR(80) NULL;
END;

IF OBJECT_ID(N'dbo.Materials', N'U') IS NOT NULL
   AND NOT EXISTS (
     SELECT 1
     FROM sys.indexes
     WHERE object_id = OBJECT_ID(N'dbo.Materials')
       AND name = N'UX_Materials_ItemCode'
   )
BEGIN
  EXEC sys.sp_executesql N'
    CREATE UNIQUE INDEX UX_Materials_ItemCode
      ON dbo.Materials(ItemCode)
      WHERE ItemCode IS NOT NULL;
  ';
END;

COMMIT TRANSACTION;
