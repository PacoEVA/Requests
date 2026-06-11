DECLARE @AdminPasswordHash NVARCHAR(255) = '$2a$10$dm3VYo80VLrsdzGn640nN.WTVBVWsDEqLjVyJnO5rpMqj5YuOLs5C';

IF NOT EXISTS (SELECT 1 FROM Roles WHERE Name = 'Admin')
  INSERT INTO Roles (Name) VALUES ('Admin');

IF NOT EXISTS (SELECT 1 FROM Roles WHERE Name = 'Compras')
  INSERT INTO Roles (Name) VALUES ('Compras');

IF NOT EXISTS (SELECT 1 FROM Roles WHERE Name = 'Supervisor')
  INSERT INTO Roles (Name) VALUES ('Supervisor');

MERGE RequisitionStatuses AS target
USING (VALUES
  ('PENDING', 'Pendiente', 1, 0),
  ('IN_REVIEW', 'En revision', 2, 0),
  ('APPROVED', 'Aprobada', 3, 0),
  ('IN_PURCHASE', 'En compra', 4, 0),
  ('READY_TO_DELIVER', 'Lista para entregar', 5, 0),
  ('PARTIALLY_DELIVERED', 'Entrega parcial', 6, 0),
  ('DELIVERED', 'Entregada', 7, 1),
  ('REJECTED', 'Rechazada', 8, 1),
  ('CANCELLED', 'Cancelada', 9, 1)
) AS source (Code, Name, SortOrder, IsFinal)
ON target.Code = source.Code
WHEN MATCHED THEN
  UPDATE SET Name = source.Name, SortOrder = source.SortOrder, IsFinal = source.IsFinal
WHEN NOT MATCHED THEN
  INSERT (Code, Name, SortOrder, IsFinal)
  VALUES (source.Code, source.Name, source.SortOrder, source.IsFinal);

MERGE Departments AS target
USING (VALUES
  ('Administracion', 'Departamento administrativo'),
  ('Contabilidad', 'Departamento contable'),
  ('Compras', 'Departamento de compras'),
  ('Ventas', 'Departamento comercial'),
  ('Almacen', 'Gestion de almacen e inventario'),
  ('Recursos Humanos', 'Gestion humana'),
  ('Tecnologia', 'Soporte y tecnologia')
) AS source (Name, Description)
ON target.Name = source.Name
WHEN MATCHED THEN
  UPDATE SET Description = source.Description, IsActive = 1
WHEN NOT MATCHED THEN
  INSERT (Name, Description)
  VALUES (source.Name, source.Description);

MERGE Materials AS target
USING (VALUES
  ('MAT-0001', 'Papel bond carta', 'Papel tamano carta', 1),
  ('MAT-0002', 'Lapicero azul', 'Lapicero tinta azul', 1),
  ('MAT-0003', 'Lapicero negro', 'Lapicero tinta negra', 1),
  ('MAT-0004', 'Folder manila', 'Folder manila tamano carta', 1),
  ('MAT-0005', 'Grapas', 'Grapas para oficina', 1),
  ('MAT-0006', 'Cinta adhesiva', 'Cinta adhesiva transparente', 1),
  ('MAT-0007', 'Toner', 'Toner para impresora', 1),
  ('MAT-0008', 'Cloro', 'Cloro para limpieza', 1),
  ('MAT-0009', 'Papel higienico', 'Papel higienico institucional', 1)
) AS source (ItemCode, Name, Description, IsRequestable)
ON target.ItemCode = source.ItemCode
WHEN MATCHED THEN
  UPDATE SET
    Name = source.Name,
    Description = source.Description,
    IsRequestable = source.IsRequestable,
    IsActive = 1
WHEN NOT MATCHED THEN
  INSERT (ItemCode, Name, Description, IsRequestable)
  VALUES (source.ItemCode, source.Name, source.Description, source.IsRequestable);

DECLARE @AdminRoleId INT = (SELECT TOP 1 Id FROM Roles WHERE Name = 'Admin');

IF NOT EXISTS (SELECT 1 FROM InternalUsers WHERE Username = 'admin')
BEGIN
  INSERT INTO InternalUsers (Username, FullName, PasswordHash, RoleId, RequirePasswordChange)
  VALUES ('admin', 'Administrador', @AdminPasswordHash, @AdminRoleId, 1);
END
