// ─────────────────────────────────────────────────────────────────
// Email template para el sistema de requisiciones
// Tablas + estilos inline: así se renderiza consistente en Outlook,
// Gmail, Apple Mail, etc. (los email clients ignoran <style> externo
// y muchas veces también flexbox/grid, por eso NO se usan aquí).
// ─────────────────────────────────────────────────────────────────

export type RequisitionStatus = "pending" | "approved" | "partial" | "rejected" | "assigned" | "ready" | "cancelled";

export interface RequisitionItem {
  /** Nombre/descripción del artículo solicitado */
  name: string;
  /** Cantidad que se solicitó originalmente */
  requestedQty: string | number;
  /** Cantidad que el administrador aprobó (si aún no se decide, se omite) */
  approvedQty?: string | number;
  /** Unidad opcional: "unidades", "cajas", "resmas", etc. */
  unit?: string;
}

export interface EmailTemplateData {
  title: string;
  subtitle?: string;
  heading?: string;
  message?: string;
  /** Pill de estado que aparece junto al título del encabezado */
  status?: RequisitionStatus;
  /** Pares clave/valor genéricos: Nº de requisición, fecha, departamento, solicitante... */
  details?: Array<{ label: string; value: string }>;
  /** Detalle de la requisición: artículos solicitados vs. aprobados */
  items?: RequisitionItem[];
  /** Supervisor asignado a la requisición */
  supervisor?: { name: string; role?: string };
  /** Nota dejada por el administrador */
  adminNote?: string;
  /** Etiqueta de la nota para distinguir empleado, administrador o supervisor. */
  noteLabel?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: string;
}

const STATUS_STYLES: Record<RequisitionStatus, { label: string; bg: string; fg: string }> = {
  pending: { label: "Pendiente", bg: "#fef3c7", fg: "#92400e" },
  approved: { label: "Aprobada", bg: "#d1fae5", fg: "#065f46" },
  partial: { label: "Aprobada parcial", bg: "#dbeafe", fg: "#1e40af" },
  rejected: { label: "Rechazada", bg: "#fee2e2", fg: "#991b1b" },
  assigned: { label: "Asignada", bg: "#e0e7ff", fg: "#3730a3" },
  ready: { label: "Lista para entregar", bg: "#cffafe", fg: "#155e75" },
  cancelled: { label: "Cancelada", bg: "#fee2e2", fg: "#991b1b" },
};

function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sectionLabel(text: string): string {
  return `<p style="margin: 0 0 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280;">${escapeHtml(
    text,
  )}</p>`;
}

export function buildEmailHtml(data: EmailTemplateData) {
  const statusBadgeHtml = data.status
    ? (() => {
        const s = STATUS_STYLES[data.status!];
        return `<span style="display: inline-block; margin-top: 10px; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; background-color: ${s.bg}; color: ${s.fg};">${s.label}</span>`;
      })()
    : "";

  const messageHtml = data.message
    ? `<p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #374151;">${escapeHtml(
        data.message,
      ).replace(/\n/g, "<br />")}</p>`
    : "";

  const detailsHtml = (data.details ?? [])
    .map(
      (detail) => `
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #4b5563; border-bottom: 1px solid #f3f4f6;">${escapeHtml(
            detail.label,
          )}</td>
          <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right; border-bottom: 1px solid #f3f4f6;">${escapeHtml(
            detail.value,
          )}</td>
        </tr>
      `,
    )
    .join("");

  const items = data.items ?? [];
  const hasApprovedCol = items.some((item) => item.approvedQty !== undefined && item.approvedQty !== "");
  const itemsRowsHtml = items
    .map((item, idx) => {
      const bg = idx % 2 === 0 ? "#ffffff" : "#f9fafb";
      const unitSuffix = item.unit ? ` ${escapeHtml(item.unit)}` : "";
      const approvedCell =
        item.approvedQty !== undefined && item.approvedQty !== ""
          ? `<td style="padding: 10px 12px; font-size: 13px; font-weight: 700; text-align: center; color: #065f46; border-bottom: 1px solid #e5e7eb;">${escapeHtml(
              item.approvedQty,
            )}${unitSuffix}</td>`
          : `<td style="padding: 10px 12px; font-size: 13px; text-align: center; color: #9ca3af; border-bottom: 1px solid #e5e7eb;">—</td>`;
      return `
        <tr style="background-color: ${bg};">
          <td style="padding: 10px 12px; font-size: 13px; color: #111827; border-bottom: 1px solid #e5e7eb;">${escapeHtml(
            item.name,
          )}</td>
          <td style="padding: 10px 12px; font-size: 13px; color: #4b5563; text-align: center; border-bottom: 1px solid #e5e7eb;">${escapeHtml(
            item.requestedQty,
          )}${unitSuffix}</td>
          ${hasApprovedCol ? approvedCell : ""}
        </tr>
      `;
    })
    .join("");

  const itemsHtml = items.length
    ? `
      ${sectionLabel("Detalle de la requisición")}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 20px; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <tr style="background-color: #f3f4f6;">
          <td style="padding: 9px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #6b7280;">Artículo</td>
          <td style="padding: 9px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #6b7280; text-align: center;">Solicitado</td>
          ${
            hasApprovedCol
              ? `<td style="padding: 9px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #6b7280; text-align: center;">Aprobado</td>`
              : ""
          }
        </tr>
        ${itemsRowsHtml}
      </table>
    `
    : "";

  const supervisorHtml = data.supervisor
    ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 16px;">
        <tr>
          <td style="background-color: #eff6ff; border-left: 3px solid #2563eb; border-radius: 6px; padding: 12px 16px;">
            <p style="margin: 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1e40af;">Supervisor asignado</p>
            <p style="margin: 4px 0 0; font-size: 15px; color: #111827; font-weight: 600;">${escapeHtml(
              data.supervisor.name,
            )}${data.supervisor.role ? ` <span style="font-weight: 400; color: #4b5563;">· ${escapeHtml(data.supervisor.role)}</span>` : ""}</p>
          </td>
        </tr>
      </table>
    `
    : "";

  const adminNoteHtml = data.adminNote
    ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 20px;">
        <tr>
          <td style="background-color: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 6px; padding: 12px 16px;">
            <p style="margin: 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #92400e;">${escapeHtml(data.noteLabel ?? "Comentario del administrador")}</p>
            <p style="margin: 6px 0 0; font-size: 14px; line-height: 1.5; color: #78350f;">${escapeHtml(
              data.adminNote,
            ).replace(/\n/g, "<br />")}</p>
          </td>
        </tr>
      </table>
    `
    : "";

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light" />
        <title>${escapeHtml(data.title)}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #111827;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6; padding: 24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 640px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.06);">
                <tr>
                  <td style="background-color: #1d4ed8; background: linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%); padding: 24px 32px; color: #ffffff;">
                    <h1 style="margin: 0; font-size: 22px; line-height: 1.3;">${escapeHtml(data.title)}</h1>
                    ${data.subtitle ? `<p style="margin: 8px 0 0; font-size: 14px; color: #dbeafe;">${escapeHtml(data.subtitle)}</p>` : ""}
                    ${statusBadgeHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 28px 32px;">
                    ${data.heading ? `<h2 style="margin: 0 0 12px; font-size: 19px; color: #111827;">${escapeHtml(data.heading)}</h2>` : ""}
                    ${messageHtml}
                    ${
                      detailsHtml
                        ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 20px; border-collapse: collapse;">${detailsHtml}</table>`
                        : ""
                    }
                    ${itemsHtml}
                    ${supervisorHtml}
                    ${adminNoteHtml}
                    ${
                      data.ctaLabel && data.ctaUrl
                        ? `<p style="margin: 24px 0 0;"><a href="${data.ctaUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; font-size: 14px;">${escapeHtml(data.ctaLabel)}</a></p>`
                        : ""
                    }
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 32px 24px; border-top: 1px solid #f3f4f6;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">${escapeHtml(
                      data.footer ?? "Este mensaje fue generado automáticamente por Requests, no lo respondas.",
                    )}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
