IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Requisitions_Code' AND object_id = OBJECT_ID('Requisitions'))
  CREATE INDEX IX_Requisitions_Code ON Requisitions(Code);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Requisitions_StatusId' AND object_id = OBJECT_ID('Requisitions'))
  CREATE INDEX IX_Requisitions_StatusId ON Requisitions(StatusId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Requisitions_EmployeeId' AND object_id = OBJECT_ID('Requisitions'))
  CREATE INDEX IX_Requisitions_EmployeeId ON Requisitions(EmployeeId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Requisitions_CreatedAt' AND object_id = OBJECT_ID('Requisitions'))
  CREATE INDEX IX_Requisitions_CreatedAt ON Requisitions(CreatedAt);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Employees_PublicToken' AND object_id = OBJECT_ID('Employees'))
  CREATE INDEX IX_Employees_PublicToken ON Employees(PublicToken);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Materials_Name' AND object_id = OBJECT_ID('Materials'))
  CREATE INDEX IX_Materials_Name ON Materials(Name);
