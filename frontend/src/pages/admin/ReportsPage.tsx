import { jsPDF } from "jspdf";
import { Download, FileBarChart, FileText, Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { requisitionService } from "../../services/requisition.service";
import type { RequisitionSummary } from "../../types/requisition.types";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import { humanizeHistoryNotes, humanizeHistoryTitle } from "../../utils/requisitionHistory";
import { recordValue } from "../../utils/record";

function asRecords(value: unknown) {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function valueText(record: Record<string, unknown>, camelKey: string, pascalKey: string, fallback = "") {
  const value = recordValue<unknown>(record, camelKey, pascalKey, fallback);
  return value === null || value === undefined ? fallback : String(value);
}

function numberText(record: Record<string, unknown>, camelKey: string, pascalKey: string) {
  const value = recordValue<unknown>(record, camelKey, pascalKey, 0);
  return Number(value ?? 0).toLocaleString();
}

function dateText(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number) {
  const lines = doc.splitTextToSize(text || "-", maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * 5;
}

function ensurePage(doc: jsPDF, y: number, needed = 18) {
  if (y + needed <= 280) return y;
  doc.addPage();
  return 18;
}

function addKeyValue(doc: jsPDF, label: string, value: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.text(label, x, y);
  doc.setFont("helvetica", "normal");
  doc.text(value || "-", x + 34, y);
}

function addTableHeader(doc: jsPDF, headers: Array<{ label: string; x: number }>, y: number) {
  doc.setFillColor(239, 244, 247);
  doc.rect(14, y - 6, 182, 9, "F");
  doc.setFont("helvetica", "bold");
  headers.forEach((header) => doc.text(header.label, header.x, y));
  doc.setFont("helvetica", "normal");
}

function materialName(item: Record<string, unknown>) {
  const code = valueText(item, "materialItemCode", "MaterialItemCode");
  const name = valueText(item, "materialName", "MaterialName", valueText(item, "manualMaterialName", "ManualMaterialName", "Material"));
  return code ? `${code} - ${name}` : name;
}

function saveRequisitionPdf(requisition: Record<string, unknown>) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const code = valueText(requisition, "code", "Code", "requisicion");
  const items = asRecords(requisition.items ?? requisition.Items);
  const history = asRecords(requisition.history ?? requisition.History);

  doc.setProperties({ title: `Requisicion ${code}` });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(`Requisicion ${code}`, 14, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 25);

  doc.setDrawColor(214, 224, 230);
  doc.line(14, 30, 196, 30);

  let y = 40;
  doc.setFontSize(11);
  addKeyValue(doc, "Empleado", valueText(requisition, "employeeName", "EmployeeName"), 14, y);
  addKeyValue(doc, "Estado", valueText(requisition, "statusName", "StatusName"), 112, y);
  y += 8;
  addKeyValue(doc, "Departamento", valueText(requisition, "departmentName", "DepartmentName"), 14, y);
  addKeyValue(doc, "Prioridad", valueText(requisition, "priority", "Priority"), 112, y);
  y += 8;
  addKeyValue(doc, "Fecha", dateText(requisition.CreatedAt ?? requisition.createdAt), 14, y);
  addKeyValue(doc, "Responsable", valueText(requisition, "assignedToName", "AssignedToName", "Sin asignar"), 112, y);
  y += 12;

  const comment = valueText(requisition, "generalComment", "GeneralComment");
  if (comment) {
    doc.setFont("helvetica", "bold");
    doc.text("Comentario general", 14, y);
    y = addWrappedText(doc, comment, 14, y + 7, 182) + 5;
  }

  y = ensurePage(doc, y, 25);
  doc.setFont("helvetica", "bold");
  doc.text("Materiales", 14, y);
  y += 10;
  addTableHeader(
    doc,
    [
      { label: "Material", x: 16 },
      { label: "Solicitado", x: 105 },
      { label: "Aprobado", x: 130 },
      { label: "Entregado", x: 155 }
    ],
    y
  );
  y += 8;

  for (const item of items) {
    y = ensurePage(doc, y, 16);
    const startY = y;
    const nextY = addWrappedText(doc, materialName(item), 16, y, 84);
    doc.text(numberText(item, "quantityRequested", "QuantityRequested"), 108, startY);
    doc.text(numberText(item, "quantityApproved", "QuantityApproved"), 133, startY);
    doc.text(numberText(item, "quantityDelivered", "QuantityDelivered"), 158, startY);
    y = Math.max(nextY, startY + 7);
    const itemComment = valueText(item, "comment", "Comment");
    if (itemComment) {
      y = addWrappedText(doc, `Nota: ${itemComment}`, 18, y, 165);
    }
    doc.setDrawColor(232, 238, 242);
    doc.line(14, y, 196, y);
    y += 6;
  }

  y = ensurePage(doc, y, 25);
  doc.setFont("helvetica", "bold");
  doc.text("Historial", 14, y);
  y += 10;
  addTableHeader(
    doc,
    [
      { label: "Fecha", x: 16 },
      { label: "Evento", x: 64 },
      { label: "Notas", x: 112 }
    ],
    y
  );
  y += 8;

  for (const entry of history) {
    y = ensurePage(doc, y, 18);
    const startY = y;
    doc.text(dateText(entry.CreatedAt ?? entry.createdAt), 16, startY);
    doc.text(humanizeHistoryTitle(entry), 64, startY);
    y = addWrappedText(doc, humanizeHistoryNotes(entry), 112, startY, 80);
    doc.setDrawColor(232, 238, 242);
    doc.line(14, y, 196, y);
    y += 6;
  }

  doc.save(`${code}.pdf`);
}

function downloadCsv(rows: RequisitionSummary[]) {
  const headers = ["Codigo", "Empleado", "Departamento", "Fecha", "Prioridad", "Estado", "Responsable"];
  const lines = rows.map((item) => {
    const record = item as Record<string, unknown>;
    return [
      recordValue<string>(record, "code", "Code", ""),
      recordValue<string>(record, "employeeName", "EmployeeName", ""),
      recordValue<string>(record, "departmentName", "DepartmentName", ""),
      recordValue<string>(record, "createdAt", "CreatedAt", ""),
      recordValue<string>(record, "priority", "Priority", ""),
      recordValue<string>(record, "statusName", "StatusName", ""),
      recordValue<string>(record, "assignedToName", "AssignedToName", "")
    ]
      .map(csvEscape)
      .join(",");
  });

  const blob = new Blob([[headers.map(csvEscape).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `requisiciones-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<RequisitionSummary[]>([]);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    status: "",
    employeeSearch: "",
    materialSearch: ""
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("success");
  const [exportingId, setExportingId] = useState<number | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    setMessage("");
    try {
      const response = await requisitionService.adminList(token, { ...filters, pageSize: 500 });
      setRows(response.requisitions);
      setMessageType("success");
      setMessage(`${response.requisitions.length} registros encontrados.`);
    } catch (error) {
      setRows([]);
      setMessageType("error");
      setMessage(friendlyErrorMessage(error, "No se pudo generar el reporte."));
    }
  }

  async function downloadRequisitionPdf(requisitionId: number) {
    if (!token) return;

    try {
      setMessage("");
      setExportingId(requisitionId);
      const response = await requisitionService.adminDetail(token, String(requisitionId));
      saveRequisitionPdf(response.requisition as Record<string, unknown>);
      setMessageType("success");
      setMessage("PDF generado correctamente.");
    } catch (error) {
      setMessageType("error");
      setMessage(friendlyErrorMessage(error, "No se pudo generar el PDF."));
    } finally {
      setExportingId(null);
    }
  }

  return (
    <>
      <PageHeader title="Reportes" eyebrow="Analisis" />
      <section className="surface dashboard-filter-panel">
        <form className="filter-grid compact-filter" onSubmit={onSubmit}>
          <label>
            Desde
            <input type="date" value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} />
          </label>
          <label>
            Hasta
            <input type="date" value={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} />
          </label>
          <label>
            Estado
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">Todos</option>
              <option value="PENDING">Pendiente</option>
              <option value="APPROVED">Aprobada</option>
              <option value="DELIVERED">Entregada</option>
              <option value="REJECTED">Rechazada</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </label>
          <label>
            Empleado
            <input value={filters.employeeSearch} onChange={(event) => setFilters({ ...filters, employeeSearch: event.target.value })} />
          </label>
          <label>
            Material
            <input value={filters.materialSearch} onChange={(event) => setFilters({ ...filters, materialSearch: event.target.value })} />
          </label>
          <button className="primary-button" type="submit">
            <Search size={18} /> Generar
          </button>
          <button className="secondary-button" type="button" disabled={rows.length === 0} onClick={() => downloadCsv(rows)}>
            <Download size={18} /> Exportar CSV
          </button>
        </form>
        {message ? <p className={messageType === "error" ? "form-error" : "form-success"}>{message}</p> : null}
      </section>

      <section className="surface">
        <h2>
          <FileBarChart size={18} /> Resultado
        </h2>
        {rows.length === 0 ? (
          <EmptyState title="No hay resultados para mostrar" message="Genere un reporte o ajuste los filtros para consultar requisiciones." />
        ) : (
          <div className="data-table compact-table">
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Empleado</th>
                <th>Departamento</th>
                <th>Fecha</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const record = item as Record<string, unknown>;
                const id = recordValue<number>(record, "id", "Id", 0);
                return (
                  <tr key={id}>
                    <td>{recordValue<string>(record, "code", "Code", "")}</td>
                    <td>{recordValue<string>(record, "employeeName", "EmployeeName", "")}</td>
                    <td>{recordValue<string>(record, "departmentName", "DepartmentName", "")}</td>
                    <td>{recordValue<string>(record, "createdAt", "CreatedAt", "")}</td>
                    <td>{recordValue<string>(record, "priority", "Priority", "")}</td>
                    <td>{recordValue<string>(record, "statusName", "StatusName", "")}</td>
                    <td>
                      <button
                        className="secondary-button small-button"
                        type="button"
                        disabled={exportingId === id}
                        onClick={() => downloadRequisitionPdf(id)}
                      >
                        <FileText size={16} /> {exportingId === id ? "Generando" : "PDF"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </section>
    </>
  );
}
