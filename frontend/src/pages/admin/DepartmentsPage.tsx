import { Plus, Workflow } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { adminService } from "../../services/admin.service";
import type { Department } from "../../types/employee.types";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import { recordId, recordName, recordValue } from "../../utils/record";

export function DepartmentsPage() {
  const { token } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("success");
  const [form, setForm] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState<number | null>(null);

  const reload = useCallback(() => {
    if (!token) return;
    adminService
      .departments(token)
      .then((response) => setDepartments(response.departments))
      .catch((error) => {
        setDepartments([]);
        setMessageType("error");
        setMessage(friendlyErrorMessage(error, "No se pudo cargar el listado de departamentos."));
      });
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setMessage("");

    try {
      if (editingId) {
        await adminService.updateDepartment(token, editingId, form);
      } else {
        await adminService.createDepartment(token, form);
      }
    } catch (error) {
      setMessageType("error");
      setMessage(friendlyErrorMessage(error, "No se pudo guardar el departamento."));
      return;
    }

    setForm({ name: "", description: "" });
    setEditingId(null);
    setMessageType("success");
    setMessage(editingId ? "Departamento actualizado correctamente." : "Departamento creado correctamente.");
    reload();
  }

  async function toggleActive(id: number, isActive: boolean) {
    if (!token) return;
    setMessage("");
    try {
      await adminService.setDepartmentActive(token, id, !isActive);
      setMessageType("success");
      setMessage(isActive ? "Departamento desactivado correctamente." : "Departamento activado correctamente.");
      reload();
    } catch (error) {
      setMessageType("error");
      setMessage(friendlyErrorMessage(error, "No se pudo cambiar el estado del departamento."));
    }
  }

  return (
    <>
      <PageHeader title="Departamentos" eyebrow="Catalogo interno" />
      <section className="stack-layout">
        <form className="surface form-grid" onSubmit={onSubmit}>
          <h2 className="span-2">
            <Workflow size={18} /> {editingId ? "Editar departamento" : "Nuevo departamento"}
          </h2>
          <label>
            Nombre
            <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            Descripcion
            <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <button className="primary-button span-2" type="submit">
            <Plus size={18} /> {editingId ? "Guardar departamento" : "Crear departamento"}
          </button>
          {message ? <p className={messageType === "error" ? "form-error span-2" : "form-success span-2"}>{message}</p> : null}
        </form>

        <div className="surface">
          <h2>Listado</h2>
          {departments.length === 0 ? (
            <EmptyState title="No hay departamentos para mostrar" message="Cuando cree departamentos, apareceran en este listado." />
          ) : (
            <div className="data-table compact-table">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripcion</th>
                  <th>Activo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((department) => {
                  const record = department as Record<string, unknown>;
                  const id = recordId(department);
                  const isActive = recordValue<boolean>(record, "isActive", "IsActive", true);

                  return (
                    <tr key={id}>
                      <td>{recordName(department)}</td>
                      <td>{recordValue<string>(record, "description", "Description", "")}</td>
                      <td>{isActive ? "Si" : "No"}</td>
                      <td>
                        <div className="button-row compact-actions">
                          <button
                            className="secondary-button small-button"
                            type="button"
                            onClick={() => {
                              setEditingId(id);
                              setForm({
                                name: recordName(department),
                                description: recordValue<string>(record, "description", "Description", "")
                              });
                            }}
                          >
                            Editar
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
