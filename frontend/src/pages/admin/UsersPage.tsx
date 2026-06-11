import { KeyRound, Plus, UserRound } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { adminService } from "../../services/admin.service";
import type { Department } from "../../types/employee.types";
import { recordId, recordName, recordValue } from "../../utils/record";

export function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<unknown[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    username: "",
    fullName: "",
    password: "",
    role: "Compras",
    departmentId: ""
  });

  const reload = useCallback(() => {
    if (!token) return;
    adminService.users(token).then((response) => setUsers(response.users)).catch(() => setUsers([]));
    adminService.departments(token).then((response) => setDepartments(response.departments)).catch(() => setDepartments([]));
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    const payload = {
      username: form.username,
      fullName: form.fullName,
      role: form.role,
      departmentId: form.departmentId ? Number(form.departmentId) : undefined
    };

    if (editingId) {
      await adminService.updateUser(token, editingId, payload);
    } else {
      await adminService.createUser(token, { ...payload, password: form.password });
    }

    setForm({ username: "", fullName: "", password: "", role: "Compras", departmentId: "" });
    setEditingId(null);
    reload();
  }

  async function resetPassword(userId: number) {
    if (!token) return;
    const response = await adminService.resetPassword(token, userId);
    setTemporaryPassword(response.temporaryPassword);
  }

  async function toggleActive(userId: number, isActive: boolean) {
    if (!token) return;
    await adminService.setUserActive(token, userId, !isActive);
    reload();
  }

  return (
    <>
      <PageHeader title="Usuarios internos" eyebrow="Admin" />
      <section className="stack-layout">
        <form className="surface form-grid" onSubmit={onSubmit}>
          <h2 className="span-2">
            <UserRound size={18} /> {editingId ? "Editar usuario" : "Nuevo usuario"}
          </h2>
          <label>
            Usuario
            <input required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
          </label>
          <label>
            Nombre
            <input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
          </label>
          {!editingId ? (
            <label>
              Contrasena temporal
              <input
                required
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </label>
          ) : null}
          <label>
            Rol
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option>Admin</option>
              <option>Compras</option>
              <option>Supervisor</option>
            </select>
          </label>
          <label>
            Departamento
            <select value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })}>
              <option value="">Sin departamento</option>
              {departments.map((department) => (
                <option key={recordId(department)} value={recordId(department)}>
                  {recordName(department)}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button span-2" type="submit">
            <Plus size={18} /> {editingId ? "Guardar usuario" : "Crear usuario"}
          </button>
          {temporaryPassword ? <p className="form-success span-2">Temporal: {temporaryPassword}</p> : null}
        </form>

        <div className="surface">
          <h2>Listado</h2>
          <div className="data-table compact-table">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Departamento</th>
                  <th>Activo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const record = user as Record<string, unknown>;
                  const id = recordValue<number>(record, "id", "Id", 0);
                  const isActive = recordValue<boolean>(record, "isActive", "IsActive", true);
                  return (
                    <tr key={id}>
                      <td>{recordValue<string>(record, "username", "Username", "")}</td>
                      <td>{recordValue<string>(record, "fullName", "FullName", "")}</td>
                      <td>{recordValue<string>(record, "roleName", "RoleName", "")}</td>
                      <td>{recordValue<string>(record, "departmentName", "DepartmentName", "")}</td>
                      <td>{isActive ? "Si" : "No"}</td>
                      <td>
                        <div className="button-row compact-actions">
                          <button
                            className="secondary-button small-button"
                            type="button"
                            onClick={() => {
                              setEditingId(id);
                              setForm({
                                username: recordValue<string>(record, "username", "Username", ""),
                                fullName: recordValue<string>(record, "fullName", "FullName", ""),
                                password: "",
                                role: recordValue<string>(record, "roleName", "RoleName", "Compras"),
                                departmentId: String(recordValue<number | string>(record, "departmentId", "DepartmentId", ""))
                              });
                            }}
                          >
                            Editar
                          </button>
                          <button className="icon-button" type="button" title="Restablecer contrasena" onClick={() => resetPassword(id)}>
                            <KeyRound size={16} />
                          </button>
                          <button className="secondary-button small-button" type="button" onClick={() => toggleActive(id, isActive)}>
                            {isActive ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
