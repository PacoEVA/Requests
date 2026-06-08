import { Download, FileBarChart } from "lucide-react";
import { PageHeader } from "../../components/common/PageHeader";

export function ReportsPage() {
  return (
    <>
      <PageHeader title="Reportes" eyebrow="Análisis" />
      <section className="surface report-grid">
        <button className="action-tile as-button" type="button">
          <FileBarChart />
          <span>Requisiciones por fecha</span>
          <small>Filtra por rango y estado.</small>
        </button>
        <button className="action-tile as-button" type="button">
          <FileBarChart />
          <span>Consumo por material</span>
          <small>Identifica materiales más solicitados.</small>
        </button>
        <button className="action-tile as-button" type="button">
          <Download />
          <span>Exportar CSV</span>
          <small>Salida operativa para análisis externo.</small>
        </button>
      </section>
    </>
  );
}
