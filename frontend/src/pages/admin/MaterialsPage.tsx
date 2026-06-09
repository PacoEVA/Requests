import { Package, Plus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { materialService } from "../../services/material.service";
import type { Material } from "../../types/material.types";
import { recordId, recordName, recordValue } from "../../utils/record";

export function MaterialsPage() {
  const { token } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [form, setForm] = useState({ name: "", unitOfMeasure: "Unidad" });

  function reload() {
    if (!token) return;
    materialService
      .adminList(token)
      .then((response) => setMaterials(response.materials))
      .catch(() => setMaterials([]));
  }

  useEffect(reload, [token]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    await materialService.create(token, { ...form, isRequestable: true });
    setForm({ name: "", unitOfMeasure: "Unidad" });
    reload();
  }

  return (
    <>
      <PageHeader title="Materiales" eyebrow="Catálogo" />
      <section className="stack-layout">
        <form className="surface form-grid" onSubmit={onSubmit}>
          <h2 className="span-2">
            <Package size={18} /> Nuevo material local
          </h2>
          <label>
            Nombre
            <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            Unidad
            <input value={form.unitOfMeasure} onChange={(event) => setForm({ ...form, unitOfMeasure: event.target.value })} />
          </label>
          <button className="primary-button span-2" type="submit">
            <Plus size={18} /> Crear material
          </button>
        </form>

        <div className="surface">
          <h2>Listado</h2>
          <div className="data-table compact-table">
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Unidad</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material) => (
                  <tr key={recordId(material)}>
                    <td>{recordName(material)}</td>
                    <td>{recordValue<string>(material as Record<string, unknown>, "unitOfMeasure", "UnitOfMeasure", "")}</td>
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
