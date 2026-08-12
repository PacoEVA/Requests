IF COL_LENGTH('dbo.InternalUsers', 'Correo') IS NULL
BEGIN
  ALTER TABLE dbo.InternalUsers ADD Correo NVARCHAR(255) NULL;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.InternalUsers')
    AND name = 'UX_InternalUsers_Correo'
)
BEGIN
  EXEC(N'
    CREATE UNIQUE INDEX UX_InternalUsers_Correo
      ON dbo.InternalUsers(Correo)
      WHERE Correo IS NOT NULL;
  ');
END;
