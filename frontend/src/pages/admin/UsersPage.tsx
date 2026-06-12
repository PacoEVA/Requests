import { KeyRound, Plus, UserRound } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { adminService } from "../../services/admin.service";
import type { Department } from "../../types/employee.types";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import { recordId, recordName, recordValue } from "../../utils/record";

export function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<unknown[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
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
    adminService
      .users(token)
      .then((response) => setUsers(response.users))
      .catch((error) => {
        setUsers([]);
        setErrorMessage(friendlyErrorMessage(error, "No se pudo cargar el listado de usuarios."));
      });
    adminService
      .departments(token)
      .then((response) => setDepartments(response.departments))
      .catch((error) => {
        setDepartments([]);
        setErrorMessage(friendlyErrorMessage(error, "No se pudo cargar el listado de departamentos."));
      });
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    const isSupervisor = form.role === "Supervisor";
    setErrorMessage("");

    if (!editingId && form.password.length < 8) {
      setErrorMessage("La contrasena temporal debe tener al menos 8 caracteres.");
      return;
    }

    if (isSupervisor && !form.departmentId) {
      setErrorMessage("Debe seleccionar un departamento para el supervisor.");
      return;
    }

    const payload = {
      username: form.username,
      fullName: form.fullName,
      role: form.role,
      departmentId: isSupervisor && form.departmentId ? Number(form.departmentId) : undefined
    };

    try {
      if (editingId) {
        await adminService.updateUser(token, editingId, payload);
      } else {
        await adminService.createUser(token, { ...payload, password: form.password });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar el usuario.");
      return;
    }

    setForm({ username: "", fullName: "", password: "", role: "Compras", departmentId: "" });
    setEditingId(null);
    reload();
  }

  async function resetPassword(userId: number) {
    if (!token) return;
    setErrorMessage("");
    try {
      const response = await adminService.resetPassword(token, userId);
      setTemporaryPassword(response.temporaryPassword);
    } catch (error) {
      setErrorMessage(friendlyErrorMessage(error, "No se pudo restablecer la contrasena."));
    }
  }

  async function toggleActive(userId: number, isActive: boolean) {
    if (!token) return;
    setErrorMessage("");
    try {
      await adminService.setUserActive(token, userId, !isActive);
      reload();
    } catch (error) {
      setErrorMessage(friendlyErrorMessage(error, "No se pudo cambiar el estado del usuario."));
    }
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
                minLength={8}
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </label>
          ) : null}
          <label>
            Rol
            <select
              value={form.role}
              onChange={(event) =>
                setForm({
                  ...form,
                  role: event.target.value,
                  departmentId: event.target.value === "Supervisor" ? form.departmentId : ""
                })
              }
            >
              <option>Admin</option>
              <option>Compras</option>
              <option>Supervisor</option>
            </select>
          </label>
          {form.role === "Supervisor" ? (
            <label>
              Departamento
              <select required value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })}>
                <option value="">Seleccione un departamento</option>
                {departments.map((department) => (
                  <option key={recordId(department)} value={recordId(department)}>
                    {recordName(department)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button className="primary-button span-2" type="submit">
            <Plus size={18} /> {editingId ? "Guardar usuario" : "Crear usuario"}
          </button>
          {errorMessage ? <p className="form-error span-2">{errorMessage}</p> : null}
          {temporaryPassword ? <p className="form-success span-2">Temporal: {temporaryPassword}</p> : null}
        </form>

        <div className="surface">
          <h2>Listado</h2>
          {users.length === 0 ? (
            <EmptyState title="No hay usuarios internos" message="Cuando cree usuarios, apareceran en este listado." />
          ) : (
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
          )}
        </div>
      </section>
    </>
  );
}
