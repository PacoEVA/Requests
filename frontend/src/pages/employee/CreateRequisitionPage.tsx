import { Plus, Send, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { useEmployee } from "../../contexts/EmployeeContext";
import { materialService } from "../../services/material.service";
import { requisitionService } from "../../services/requisition.service";
import type { Material } from "../../types/material.types";
import type { RequisitionItemDraft, RequisitionPriority } from "../../types/requisition.types";
import { recordId, recordName } from "../../utils/record";

const emptyItem: RequisitionItemDraft = {
  quantityRequested: 1,
  unitOfMeasure: "Unidad"
};

export function CreateRequisitionPage() {
  const navigate = useNavigate();
  const { employeeToken } = useEmployee();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [priority, setPriority] = useState<RequisitionPriority>("Media");
  const [generalComment, setGeneralComment] = useState("");
  const [items, setItems] = useState<RequisitionItemDraft[]>([{ ...emptyItem }]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    materialService.publicList().then((response) => setMaterials(response.materials)).catch(() => setMaterials([]));
  }, []);

  function updateItem(index: number, patch: Partial<RequisitionItemDraft>) {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!employeeToken) return;
    if (!window.confirm("¿Enviar esta requisición a Compras?")) return;

    setMessage("");

    try {
      const cleanItems = items.map((item) => ({
        ...item,
        materialId: item.materialId || undefined,
        manualMaterialName: item.manualMaterialName || undefined
      }));
      await requisitionService.create(employeeToken, { priority, generalComment, items: cleanItems });
      navigate("/employee/requisitions");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear la requisición");
    }
  }

  return (
    <>
      <PageHeader title="Nueva requisición" eyebrow="Material gastable" />
      <form className="surface form-grid wide" onSubmit={onSubmit}>
        <label>
          Prioridad
          <select value={priority} onChange={(event) => setPriority(event.target.value as RequisitionPriority)}>
            <option>Baja</option>
            <option>Media</option>
            <option>Alta</option>
            <option>Urgente</option>
          </select>
        </label>
        <label className="span-2">
          Comentario general
          <textarea value={generalComment} onChange={(event) => setGeneralComment(event.target.value)} rows={3} />
        </label>
        <div className="span-2 item-list">
          {items.map((item, index) => (
            <fieldset className="line-item" key={index}>
              <legend>Material {index + 1}</legend>
              <label>
                Catálogo
                <select
                  value={item.materialId ?? ""}
                  onChange={(event) =>
                    updateItem(index, {
                      materialId: Number(event.target.value) || undefined,
                      manualMaterialName: ""
                    })
                  }
                >
                  <option value="">Material manual</option>
                  {materials.map((material) => (
                    <option key={recordId(material)} value={recordId(material)}>
                      {recordName(material)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Material manual
                <input
                  value={item.manualMaterialName ?? ""}
                  disabled={Boolean(item.materialId)}
                  onChange={(event) => updateItem(index, { manualMaterialName: event.target.value })}
                />
              </label>
              <label>
                Cantidad
                <input
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={item.quantityRequested}
                  onChange={(event) => updateItem(index, { quantityRequested: Number(event.target.value) })}
                />
              </label>
              <label>
                Unidad
                <input
                  value={item.unitOfMeasure ?? ""}
                  onChange={(event) => updateItem(index, { unitOfMeasure: event.target.value })}
                />
              </label>
              <label className="span-2">
                Observación
                <input value={item.comment ?? ""} onChange={(event) => updateItem(index, { comment: event.target.value })} />
              </label>
              <button
                className="icon-button danger"
                type="button"
                aria-label="Eliminar material"
                title="Eliminar material"
                onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                disabled={items.length === 1}
              >
                <Trash2 size={18} />
              </button>
            </fieldset>
          ))}
        </div>
        {message ? <p className="form-error span-2">{message}</p> : null}
        <div className="button-row span-2">
          <button className="secondary-button" type="button" onClick={() => setItems([...items, { ...emptyItem }])}>
            <Plus size={18} /> Agregar material
          </button>
          <button className="primary-button" type="submit">
            <Send size={18} /> Enviar requisición
          </button>
        </div>
      </form>
    </>
  );
}
