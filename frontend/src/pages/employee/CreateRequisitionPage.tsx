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
  quantityRequested: 1
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
    materialService
      .publicList()
      .then((response) => setMaterials(response.materials))
      .catch(() => setMaterials([]));
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
      <form className="surface requisition-form" onSubmit={onSubmit}>
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="requisition-priority">
              Prioridad
            </label>
            <select
              id="requisition-priority"
              className="form-select"
              value={priority}
              onChange={(event) => setPriority(event.target.value as RequisitionPriority)}
            >
              <option>Baja</option>
              <option>Media</option>
              <option>Alta</option>
              <option>Urgente</option>
            </select>
          </div>
          <div className="col-12 col-md-8">
            <label className="form-label" htmlFor="requisition-comment">
              Comentario general
            </label>
            <textarea
              id="requisition-comment"
              className="form-control"
              value={generalComment}
              onChange={(event) => setGeneralComment(event.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="requisition-lines-header">
          <div>
            <h2>Líneas de requisición</h2>
            <p>Inserta una fila por cada material solicitado.</p>
          </div>
          <button className="secondary-button" type="button" onClick={() => setItems([...items, { ...emptyItem }])}>
            <Plus size={18} /> Insertar línea
          </button>
        </div>

        <div className="table-responsive requisition-lines-shell">
          <table className="table table-hover align-middle requisition-lines-table mb-0">
            <thead>
              <tr>
                <th className="line-number">#</th>
                <th>Material de catálogo</th>
                <th>Material manual</th>
                <th>Cantidad</th>
                <th>Observación</th>
                <th className="line-actions">Acción</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="line-number">{index + 1}</td>
                  <td>
                    <select
                      className="form-select form-select-sm"
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
                  </td>
                  <td>
                    <input
                      className="form-control form-control-sm"
                      value={item.manualMaterialName ?? ""}
                      disabled={Boolean(item.materialId)}
                      placeholder="Nombre del material"
                      onChange={(event) => updateItem(index, { manualMaterialName: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="form-control form-control-sm text-end"
                      min="0.01"
                      step="0.01"
                      type="number"
                      value={item.quantityRequested}
                      onChange={(event) => updateItem(index, { quantityRequested: Number(event.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      className="form-control form-control-sm"
                      value={item.comment ?? ""}
                      placeholder="Detalle opcional"
                      onChange={(event) => updateItem(index, { comment: event.target.value })}
                    />
                  </td>
                  <td className="line-actions">
                    <button
                      className="icon-button danger"
                      type="button"
                      aria-label="Eliminar línea"
                      title="Eliminar línea"
                      onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      disabled={items.length === 1}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {message ? <p className="form-error mt-3">{message}</p> : null}
        <div className="button-row justify-content-end mt-4">
          <button className="primary-button" type="submit">
            <Send size={18} /> Enviar requisición
          </button>
        </div>
      </form>
    </>
  );
}
