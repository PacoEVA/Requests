import { Package, Plus } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { materialService } from "../../services/material.service";
import type { Material } from "../../types/material.types";
import { recordId, recordName, recordValue } from "../../utils/record";

export function MaterialsPage() {
  const { token } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);
  const [form, setForm] = useState({
    itemCode: "",
    name: "",
    description: "",
    isRequestable: true
  });

  const reload = useCallback(() => {
    if (!token) return;
    materialService.adminList(token).then((response) => setMaterials(response.materials)).catch(() => setMaterials([]));
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    const payload = {
      itemCode: form.itemCode.trim() || undefined,
      name: form.name,
      description: form.description || undefined,
      isRequestable: form.isRequestable
    };

    if (editingMaterialId) {
      await materialService.update(token, editingMaterialId, payload);
    } else {
      await materialService.create(token, payload);
    }

    setEditingMaterialId(null);
    setForm({ itemCode: "", name: "", description: "", isRequestable: true });
    reload();
  }

  async function toggleMaterial(id: number, isActive: boolean) {
    if (!token) return;
    await materialService.setActive(token, id, !isActive);
    reload();
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
        </form>

        <div className="surface">
          <h2>Listado de materiales</h2>
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
        </div>
      </section>
    </>
  );
}
