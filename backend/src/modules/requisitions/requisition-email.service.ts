import { env } from "../../config/env";
import { buildEmailHtml, type RequisitionItem } from "../../utils/email-templates";
import { sendEmail } from "../../utils/send-email";
import type { AuthenticatedUser } from "../auth/auth.types";
import { usersService } from "../users/users.service";

type RequisitionRecord = Record<string, unknown>;

function text(record: RequisitionRecord | null | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return "";
}

function numberText(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? numeric.toLocaleString("es-DO", { maximumFractionDigits: 4 })
    : String(value ?? "-");
}

function requisitionItems(requisition: RequisitionRecord, includeApproved: boolean): RequisitionItem[] {
  const rows = Array.isArray(requisition.items) ? requisition.items : [];
  return rows.map((value) => {
    const item = value as RequisitionRecord;
    const requested = item.QuantityRequested ?? item.quantityRequested ?? 0;
    const approved = item.QuantityApproved ?? item.quantityApproved ?? requested;

    return {
      name: text(item, "MaterialName", "materialName", "ManualMaterialName", "manualMaterialName") || "Material",
      requestedQty: numberText(requested),
      approvedQty: includeApproved ? numberText(approved) : undefined
    };
  });
}

function requisitionId(requisition: RequisitionRecord) {
  return Number(requisition.Id ?? requisition.id ?? 0);
}

function requisitionCode(requisition: RequisitionRecord) {
  return text(requisition, "Code", "code") || `#${requisitionId(requisition)}`;
}

function baseDetails(requisition: RequisitionRecord) {
  return [
    { label: "Requisicion", value: requisitionCode(requisition) },
    { label: "Solicitante", value: text(requisition, "EmployeeName", "employeeName") || "No disponible" },
    { label: "Departamento", value: text(requisition, "DepartmentName", "departmentName") || "No disponible" },
    { label: "Prioridad", value: text(requisition, "Priority", "priority") || "Media" }
  ];
}

function appLink(path: string) {
  const baseUrl = env.PUBLIC_APP_URL?.trim() || env.CLIENT_ORIGIN.trim();
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function sendToRecipients(recipients: string[], subject: string, html: string) {
  const uniqueRecipients = [...new Set(recipients.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (!uniqueRecipients.length) {
    console.warn(`Correo omitido porque no hay destinatarios configurados: ${subject}`);
    return;
  }

  const results = await Promise.allSettled(
    uniqueRecipients.map((to) => sendEmail({ to, subject, html }))
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`No se pudo enviar '${subject}' a ${uniqueRecipients[index]}`, result.reason);
    }
  });
}

/** Construye y envia los correos asociados a eventos relevantes de requisiciones. */
export class RequisitionEmailService {
  async notifyCreated(requisition: RequisitionRecord) {
    const recipients = await usersService.listActivePurchasingEmailRecipients();
    const code = requisitionCode(requisition);
    const html = buildEmailHtml({
      title: "Nueva requisicion creada",
      subtitle: `${code} requiere revision del equipo de compras.`,
      heading: "Nueva solicitud de materiales",
      status: "pending",
      message: "Se registro una nueva requisicion. Revisa sus articulos, prioridad y comentario antes de gestionarla.",
      details: baseDetails(requisition),
      items: requisitionItems(requisition, false),
      adminNote: text(requisition, "GeneralComment", "generalComment") || "Sin comentario adicional.",
      noteLabel: "Comentario del empleado",
      ctaLabel: "Revisar requisicion",
      ctaUrl: appLink(`/admin/requisitions/${requisitionId(requisition)}`)
    });

    await sendToRecipients(
      recipients.map((recipient) => text(recipient, "Correo", "email")),
      `Nueva requisicion ${code}`,
      html
    );
  }

  async notifyApproved(requisition: RequisitionRecord, actor: AuthenticatedUser, comment: string) {
    const code = requisitionCode(requisition);
    const html = buildEmailHtml({
      title: "Requisicion aprobada",
      subtitle: `${code} fue aprobada.`,
      heading: "Tu solicitud fue aprobada",
      status: "approved",
      message: "Estas son las cantidades aprobadas para cada articulo de tu requisicion.",
      details: [...baseDetails(requisition), { label: "Aprobada por", value: actor.fullName }],
      items: requisitionItems(requisition, true),
      adminNote: comment,
      noteLabel: actor.role === "Supervisor" ? "Comentario del supervisor" : "Comentario del administrador",
      ctaLabel: "Ver requisicion",
      ctaUrl: appLink(`/employee/requisitions/${requisitionId(requisition)}`)
    });

    await sendToRecipients([text(requisition, "EmployeeEmail", "employeeEmail")], `Requisicion ${code} aprobada`, html);
  }

  async notifyAssigned(
    requisition: RequisitionRecord,
    supervisor: RequisitionRecord,
    actor: AuthenticatedUser,
    comment: string
  ) {
    const code = requisitionCode(requisition);
    const supervisorName = text(supervisor, "FullName", "fullName") || "Supervisor";
    const html = buildEmailHtml({
      title: "Requisicion asignada",
      subtitle: `${code} fue asignada a tu usuario.`,
      heading: "Tienes una requisicion pendiente de revision",
      status: "assigned",
      message: "Revisa la solicitud y registra la decision correspondiente desde el sistema.",
      details: [...baseDetails(requisition), { label: "Asignada por", value: actor.fullName }],
      items: requisitionItems(requisition, false),
      supervisor: { name: supervisorName, role: "Supervisor" },
      adminNote: comment,
      noteLabel: "Comentario del administrador",
      ctaLabel: "Revisar requisicion",
      ctaUrl: appLink(`/admin/requisitions/${requisitionId(requisition)}`)
    });

    await sendToRecipients([text(supervisor, "Correo", "email")], `Requisicion ${code} asignada`, html);
  }

  async notifyCancelled(requisition: RequisitionRecord, actorName: string, actorLabel: string, comment: string) {
    const code = requisitionCode(requisition);
    const html = buildEmailHtml({
      title: "Requisicion cancelada",
      subtitle: `${code} ya no continuara su proceso.`,
      heading: "Tu requisicion fue cancelada",
      status: "cancelled",
      message: "Consulta el comentario incluido para conocer el motivo de la cancelacion.",
      details: [...baseDetails(requisition), { label: "Cancelada por", value: actorName }],
      items: requisitionItems(requisition, false),
      adminNote: comment,
      noteLabel: actorLabel,
      ctaLabel: "Ver requisicion",
      ctaUrl: appLink(`/employee/requisitions/${requisitionId(requisition)}`)
    });

    await sendToRecipients([text(requisition, "EmployeeEmail", "employeeEmail")], `Requisicion ${code} cancelada`, html);
  }

  async notifyReady(requisition: RequisitionRecord, actor: AuthenticatedUser, comment: string) {
    const code = requisitionCode(requisition);
    const html = buildEmailHtml({
      title: "Requisicion lista para entregar",
      subtitle: `${code} ya esta disponible.`,
      heading: "Tus materiales estan listos",
      status: "ready",
      message: "La requisicion esta lista para ser retirada o entregada segun el procedimiento de tu departamento.",
      details: [...baseDetails(requisition), { label: "Actualizada por", value: actor.fullName }],
      items: requisitionItems(requisition, true),
      adminNote: comment,
      noteLabel: actor.role === "Supervisor" ? "Comentario del supervisor" : "Comentario del administrador",
      ctaLabel: "Ver requisicion",
      ctaUrl: appLink(`/employee/requisitions/${requisitionId(requisition)}`)
    });

    await sendToRecipients([text(requisition, "EmployeeEmail", "employeeEmail")], `Requisicion ${code} lista para entregar`, html);
  }
}

export const requisitionEmailService = new RequisitionEmailService();
