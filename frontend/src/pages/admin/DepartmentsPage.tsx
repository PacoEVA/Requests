import { Plus, Workflow } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { adminService } from "../../services/admin.service";
import type { Department } from "../../types/employee.types";
import { recordId, recordName, recordValue } from "../../utils/record";

export function DepartmentsPage() {
  const { token } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState({ name: "", description: "" });

  function reload() {
    if (!token) return;
    adminService
      .departments(token)
      .then((response) => setDepartments(response.departments))
      .catch(() => setDepartments([]));
  }

  useEffect(reload, [token]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    await adminService.createDepartment(token, form);
    setForm({ name: "", description: "" });
    reload();
  }

  return (
    <>
      <PageHeader title="Departamentos" eyebrow="Catálogo interno" />
      <section className="stack-layout">
        <form className="surface form-grid" onSubmit={onSubmit}>
          <h2 className="span-2">
            <Workflow size={18} /> Nuevo departamento
          </h2>
          <label>
            Nombre
            <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            Descripción
            <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <button className="primary-button span-2" type="submit">
            <Plus size={18} /> Crear departamento
          </button>
        </form>

        <div className="surface">
          <h2>Listado</h2>
          <div className="data-table compact-table">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Activo</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((department) => (
                  <tr key={recordId(department)}>
                    <td>{recordName(department)}</td>
                    <td>{recordValue<boolean>(department as Record<string, unknown>, "isActive", "IsActive", true) ? "Sí" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
