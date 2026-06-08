INSERT INTO Roles (Name)
VALUES ('Admin'), ('Compras'), ('Supervisor');

INSERT INTO RequisitionStatuses (Code, Name, SortOrder, IsFinal)
VALUES
  ('PENDING', 'Pendiente', 10, 0),
  ('IN_REVIEW', 'En revisión', 20, 0),
  ('APPROVED', 'Aprobada', 30, 0),
  ('REJECTED', 'Rechazada', 40, 1),
  ('IN_PURCHASE', 'En compra', 50, 0),
  ('READY_TO_DELIVER', 'Lista para entregar', 60, 0),
  ('PARTIALLY_DELIVERED', 'Entrega parcial', 70, 0),
  ('DELIVERED', 'Entregada', 80, 1),
  ('CANCELLED', 'Cancelada', 90, 1);

INSERT INTO Departments (Name, Description)
VALUES
  ('Administración', 'Departamento administrativo'),
  ('Compras', 'Departamento de compras'),
  ('Contabilidad', 'Departamento contable');

-- Password temporal pendiente de reemplazar por hash bcrypt real antes de producción.
-- Crear el usuario admin desde un script de seed seguro o actualizar PasswordHash con bcrypt.
