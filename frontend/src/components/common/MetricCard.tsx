import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "neutral"
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "neutral" | "info" | "success" | "danger" | "warning";
}) {
  return (
    <article className={`metric-card metric-card-${tone}`}>
      <Icon aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
