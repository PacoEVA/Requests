export function StatusBadge({ status }: { status?: string }) {
  const normalized = status?.toLowerCase().replaceAll(" ", "-") ?? "pendiente";
  return <span className={`status-badge status-${normalized}`}>{status ?? "Pendiente"}</span>;
}
