/*
  Replaces public-token identification with username/password authentication.
  Existing employee rows remain usable for historical requisitions and can be
  provisioned through registration by matching their existing EmployeeCode.
*/
IF COL_LENGTH(N'dbo.Employees', N'Usuario') IS NULL
BEGIN
  ALTER TABLE dbo.Employees ADD Usuario NVARCHAR(80) NULL;
END;

IF COL_LENGTH(N'dbo.Employees', N'PasswordHash') IS NULL
BEGIN
  ALTER TABLE dbo.Employees ADD PasswordHash NVARCHAR(255) NULL;
END;

IF COL_LENGTH(N'dbo.Employees', N'LastLoginAt') IS NULL
BEGIN
  ALTER TABLE dbo.Employees ADD LastLoginAt DATETIME2 NULL;
END;

IF EXISTS (
  SELECT EmployeeCode
  FROM dbo.Employees
  WHERE EmployeeCode IS NOT NULL
  GROUP BY EmployeeCode
  HAVING COUNT(*) > 1
)
  THROW 51001, 'No se puede crear UX_Employees_EmployeeCode: existen codigos de empleado duplicados.', 1;

IF EXISTS (
  SELECT Correo
  FROM dbo.Employees
  WHERE Correo IS NOT NULL
  GROUP BY Correo
  HAVING COUNT(*) > 1
)
  THROW 51002, 'No se puede crear UX_Employees_Correo: existen correos duplicados.', 1;

EXEC(N'
  IF EXISTS (
    SELECT Usuario
    FROM dbo.Employees
    WHERE Usuario IS NOT NULL
    GROUP BY Usuario
    HAVING COUNT(*) > 1
  )
    THROW 51003, ''No se puede crear UX_Employees_Usuario: existen usuarios duplicados.'', 1;
');

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'UX_Employees_EmployeeCode' AND object_id = OBJECT_ID(N'dbo.Employees')
)
  CREATE UNIQUE INDEX UX_Employees_EmployeeCode
    ON dbo.Employees(EmployeeCode)
    WHERE EmployeeCode IS NOT NULL;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'UX_Employees_Correo' AND object_id = OBJECT_ID(N'dbo.Employees')
)
  CREATE UNIQUE INDEX UX_Employees_Correo
    ON dbo.Employees(Correo)
    WHERE Correo IS NOT NULL;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'UX_Employees_Usuario' AND object_id = OBJECT_ID(N'dbo.Employees')
)
  EXEC(N'
    CREATE UNIQUE INDEX UX_Employees_Usuario
      ON dbo.Employees(Usuario)
      WHERE Usuario IS NOT NULL;
  ');
