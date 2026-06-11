export function StatusBadge({ status }: { status?: string }) {
  const normalized =
    status
      ?.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replaceAll(" ", "-") ?? "pendiente";
  return <span className={`status-badge status-${normalized}`}>{status ?? "Pendiente"}</span>;
}
