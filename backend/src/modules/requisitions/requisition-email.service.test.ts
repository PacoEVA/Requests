import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "../../utils/send-email";
import { usersService } from "../users/users.service";
import { requisitionEmailService } from "./requisition-email.service";

vi.mock("../../utils/send-email", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../users/users.service", () => ({
  usersService: {
    listActivePurchasingEmailRecipients: vi.fn()
  }
}));

const requisition = {
  Id: 42,
  Code: "REQ-2026-0042",
  EmployeeName: "Ana Perez",
  EmployeeEmail: "ana@example.com",
  DepartmentName: "Operaciones",
  Priority: "Alta",
  GeneralComment: "Necesario para la semana entrante",
  items: [
    {
      MaterialName: "Resma de papel",
      QuantityRequested: 5,
      QuantityApproved: 3
    }
  ]
};

const admin = {
  kind: "internal" as const,
  sub: 1,
  id: 1,
  username: "admin",
  fullName: "Administrador Compras",
  role: "Admin" as const,
  requirePasswordChange: false
};

describe("RequisitionEmailService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("notifica la creacion a todos los destinatarios activos de compras", async () => {
    vi.mocked(usersService.listActivePurchasingEmailRecipients).mockResolvedValue([
      { Correo: "compras@example.com" },
      { Correo: "admin@example.com" }
    ] as never);

    await requisitionEmailService.notifyCreated(requisition);

    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "compras@example.com" }));
    expect(vi.mocked(sendEmail).mock.calls[0][0].html).toContain("Necesario para la semana entrante");
  });

  it("incluye articulos y cantidades aprobadas en el correo al empleado", async () => {
    await requisitionEmailService.notifyApproved(requisition, admin, "Aprobada por disponibilidad");

    const email = vi.mocked(sendEmail).mock.calls[0][0];
    expect(email.to).toBe("ana@example.com");
    expect(email.subject).toContain("REQ-2026-0042");
    expect(email.html).toContain("Resma de papel");
    expect(email.html).toContain("Aprobada por disponibilidad");
    expect(email.html).toContain(">3</td>");
  });

  it("notifica al supervisor asignado con el comentario del administrador", async () => {
    await requisitionEmailService.notifyAssigned(
      requisition,
      { Id: 7, FullName: "Supervisor Uno", Correo: "supervisor@example.com" },
      admin,
      "Validar necesidad con el area"
    );

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "supervisor@example.com", subject: expect.stringContaining("asignada") })
    );
    expect(vi.mocked(sendEmail).mock.calls[0][0].html).toContain("Validar necesidad con el area");
  });

  it("notifica cancelacion y disponibilidad al correo del empleado", async () => {
    await requisitionEmailService.notifyCancelled(
      requisition,
      admin.fullName,
      "Comentario del administrador",
      "Solicitud duplicada"
    );
    await requisitionEmailService.notifyReady(requisition, admin, "Retirar en almacen");

    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(vi.mocked(sendEmail).mock.calls[0][0].subject).toContain("cancelada");
    expect(vi.mocked(sendEmail).mock.calls[1][0].subject).toContain("lista para entregar");
    expect(vi.mocked(sendEmail).mock.calls[1][0].html).toContain("Retirar en almacen");
  });
});
