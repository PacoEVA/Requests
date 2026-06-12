import { Package, Plus } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { materialService } from "../../services/material.service";
import type { Material } from "../../types/material.types";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import { recordId, recordName, recordValue } from "../../utils/record";

export function MaterialsPage() {
  const { token } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("success");
  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);
  const [form, setForm] = useState({
    itemCode: "",
    name: "",
    description: "",
    isRequestable: true
  });

  const reload = useCallback(() => {
    if (!token) return;
    materialService
      .adminList(token)
      .then((response) => {
        setMaterials(response.materials);
      })
      .catch((error) => {
        setMaterials([]);
        setMessageType("error");
        setMessage(friendlyErrorMessage(error, "No se pudo cargar el catalogo de materiales."));
      });
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setMessage("");

    const payload = {
      itemCode: form.itemCode.trim() || undefined,
      name: form.name,
      description: form.description || undefined,
      isRequestable: form.isRequestable
    };

    try {
      if (editingMaterialId) {
        await materialService.update(token, editingMaterialId, payload);
      } else {
        await materialService.create(token, payload);
      }
    } catch (error) {
      setMessageType("error");
      setMessage(friendlyErrorMessage(error, "No se pudo guardar el material."));
      return;
    }

    setEditingMaterialId(null);
    setForm({ itemCode: "", name: "", description: "", isRequestable: true });
    setMessageType("success");
    setMessage(editingMaterialId ? "Material actualizado correctamente." : "Material creado correctamente.");
    reload();
  }

  async function toggleMaterial(id: number, isActive: boolean) {
    if (!token) return;
    setMessage("");
    try {
      await materialService.setActive(token, id, !isActive);
      setMessageType("success");
      setMessage(isActive ? "Material desactivado correctamente." : "Material activado correctamente.");
      reload();
    } catch (error) {
      setMessageType("error");
      setMessage(friendlyErrorMessage(error, "No se pudo cambiar el estado del material."));
    }
  }

  return (
    <>
      <PageHeader title="Materiales" eyebrow="Catalogo" />
      <section className="stack-layout">
        <form className="surface form-grid" onSubmit={onSubmit}>
          <h2 className="span-2">
            <Package size={18} /> {editingMaterialId ? "Editar material" : "Nuevo material"}
          </h2>
          <label>
            ItemCode
            <input value={form.itemCode} onChange={(event) => setForm({ ...form, itemCode: event.target.value })} />
          </label>
          <label>
            Nombre
            <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label className="span-2">
            Descripcion
            <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <label className="checkbox-label span-2">
            <input
              type="checkbox"
              checked={form.isRequestable}
              onChange={(event) => setForm({ ...form, isRequestable: event.target.checked })}
            />
            Puede solicitarse
          </label>
          <button className="primary-button span-2" type="submit">
            <Plus size={18} /> {editingMaterialId ? "Guardar material" : "Crear material"}
          </button>
          {message ? <p className={messageType === "error" ? "form-error span-2" : "form-success span-2"}>{message}</p> : null}
        </form>

        <div className="surface">
          <h2>Listado de materiales</h2>
          {materials.length === 0 ? (
            <EmptyState title="No hay materiales para mostrar" message="Cuando cree materiales, apareceran en este listado." />
          ) : (
            <div className="data-table compact-table">
            <table>
              <thead>
                <tr>
                  <th>ItemCode</th>
                  <th>Material</th>
                  <th>Descripcion</th>
                  <th>Solicitable</th>
                  <th>Activo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material) => {
                  const record = material as Record<string, unknown>;
                  const id = recordId(material);
                  const isActive = recordValue<boolean>(record, "isActive", "IsActive", true);
                  return (
                    <tr key={id}>
                      <td>{recordValue<string>(record, "itemCode", "ItemCode", "")}</td>
                      <td>{recordName(material)}</td>
                      <td>{recordValue<string>(record, "description", "Description", "")}</td>
                      <td>{recordValue<boolean>(record, "isRequestable", "IsRequestable", true) ? "Si" : "No"}</td>
                      <td>{isActive ? "Si" : "No"}</td>
                      <td>
                        <div className="button-row compact-actions">
                          <button
                            className="secondary-button small-button"
                            type="button"
                            onClick={() => {
                              setEditingMaterialId(id);
                              setForm({
                                itemCode: recordValue<string>(record, "itemCode", "ItemCode", ""),
                                name: recordName(material),
                                description: recordValue<string>(record, "description", "Description", ""),
                                isRequestable: recordValue<boolean>(record, "isRequestable", "IsRequestable", true)
                              });
                            }}
                          >
                            Editar
                          </button>
                          <button className="secondary-button small-button" type="button" onClick={() => toggleMaterial(id, isActive)}>
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
