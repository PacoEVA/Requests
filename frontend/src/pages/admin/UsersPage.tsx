import { KeyRound, Plus, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { adminService } from "../../services/admin.service";
import { recordValue } from "../../utils/record";

export function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<unknown[]>([]);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [form, setForm] = useState({
    username: "",
    fullName: "",
    password: "",
    role: "Compras"
  });

  function reload() {
    if (!token) return;
    adminService.users(token).then((response) => setUsers(response.users)).catch(() => setUsers([]));
  }

  useEffect(reload, [token]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    await adminService.createUser(token, form);
    setForm({ username: "", fullName: "", password: "", role: "Compras" });
    reload();
  }

  async function resetPassword(userId: number) {
    if (!token) return;
    const response = await adminService.resetPassword(token, userId);
    setTemporaryPassword(response.temporaryPassword);
  }

  return (
    <>
      <PageHeader title="Usuarios internos" eyebrow="Admin" />
      <section className="split-grid">
        <form className="surface form-grid" onSubmit={onSubmit}>
          <h2 className="span-2">
            <UserRound size={18} /> Nuevo usuario
          </h2>
          <label>
            Usuario
            <input required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
          </label>
          <label>
            Nombre
            <input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
          </label>
          <label>
            Contraseña temporal
            <input
              required
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>
          <label>
            Rol
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option>Admin</option>
              <option>Compras</option>
              <option>Supervisor</option>
            </select>
          </label>
          <button className="primary-button span-2" type="submit">
            <Plus size={18} /> Crear usuario
          </button>
          {temporaryPassword ? <p className="form-success span-2">Temporal: {temporaryPassword}</p> : null}
        </form>
        <div className="surface">
          <h2>Listado</h2>
          <div className="data-table compact-table">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const record = user as Record<string, unknown>;
                  const id = recordValue<number>(record, "id", "Id", 0);
                  return (
                    <tr key={id}>
                      <td>{recordValue<string>(record, "fullName", "FullName", "")}</td>
                      <td>{recordValue<string>(record, "roleName", "RoleName", "")}</td>
                      <td>
                        <button className="icon-button" type="button" title="Restablecer contraseña" onClick={() => resetPassword(id)}>
                          <KeyRound size={16} />
                        </button>
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
