/*
  Adds the contact email used by the employee identification/profile flow.
  Safe to execute once on existing Requests databases.
*/
IF COL_LENGTH(N'dbo.Employees', N'Correo') IS NULL
BEGIN
  ALTER TABLE dbo.Employees
    ADD Correo NVARCHAR(255) NULL;
END;
