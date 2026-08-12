import { env } from "../config/env";
import type { Email } from "../types/email";

function buildEmailServiceUrl() {
  const baseUrl = env.EMAIL_SERVICE_URL.trim().replace(/\/$/, "");
  return `${baseUrl}/send_email`;
}

export async function sendEmail(email: Email): Promise<void> {
  const response = await fetch(buildEmailServiceUrl(), {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": env.EMAIL_API_KEY,
    },
    body: JSON.stringify({
      to: email.to,
      subject: email.subject,
      html: email.html,
    }),
  });

  if (!response.ok) {
    let message = `No se pudo enviar el correo (${response.status})`;

    try {
      const payload = await response.json();
      if (typeof payload?.error === "string" && payload.error.trim()) {
        message = payload.error;
      }
    } catch {
      // Ignora errores de parseo y conserva el mensaje base.
    }

    throw new Error(message);
  }
}
