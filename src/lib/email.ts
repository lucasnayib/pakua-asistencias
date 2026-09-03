import nodemailer from "nodemailer";

type EmailConfig = {
  user: string;
  appPassword: string;
  notificationsTo: string;
};

/**
 * Igual que getCredentials() en google-drive.ts: si falta alguna variable de entorno,
 * el envío de mail simplemente se salta (no rompe el flujo que lo llama).
 */
function getEmailConfig(): EmailConfig | null {
  const user = process.env.EMAIL_SMTP_USER;
  const appPassword = process.env.EMAIL_SMTP_APP_PASSWORD;
  const notificationsTo = process.env.EMAIL_ADMIN_NOTIFICATIONS;
  if (!user || !appPassword || !notificationsTo) return null;
  return { user, appPassword, notificationsTo };
}

function baseUrl(): string | null {
  const url = process.env.APP_BASE_URL;
  return url ? url.replace(/\/+$/, "") : null;
}

async function sendMail(config: EmailConfig, to: string, subject: string, text: string): Promise<void> {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: config.user, pass: config.appPassword },
    });
    await transporter.sendMail({
      from: `"Pakua Asistencias" <${config.user}>`,
      to,
      subject,
      text,
    });
  } catch (error) {
    console.error("No se pudo enviar el mail:", error);
  }
}

export async function notifyNewSchoolRequest(data: {
  displayName: string;
  username: string;
  contactEmail: string;
  contactPhone: string;
}): Promise<void> {
  const config = getEmailConfig();
  if (!config) return;

  const url = baseUrl();
  const reviewLine = url
    ? `Revisala acá: ${url}/admin/admins`
    : `Entrá al panel de Administradores para revisarla.`;

  await sendMail(
    config,
    config.notificationsTo,
    `Nueva solicitud de escuela: ${data.displayName}`,
    [
      `Llegó una solicitud de alta de escuela.`,
      ``,
      `Escuela: ${data.displayName}`,
      `Usuario: ${data.username}`,
      `Email de contacto: ${data.contactEmail}`,
      `Teléfono de contacto: ${data.contactPhone}`,
      ``,
      reviewLine,
    ].join("\n")
  );
}

export async function notifySchoolApproved(data: {
  contactEmail: string | null;
  displayName: string;
  username: string;
  slug: string;
}): Promise<void> {
  const config = getEmailConfig();
  if (!config || !data.contactEmail) return;

  const url = baseUrl();
  const accessLine = url
    ? `Ya podés tomar asistencia en: ${url}/escuela/${data.slug}`
    : `Ya podés ingresar al panel con tu usuario y contraseña.`;

  await sendMail(
    config,
    data.contactEmail,
    `Tu escuela "${data.displayName}" fue aprobada`,
    [
      `¡Buenas noticias! Tu solicitud para "${data.displayName}" fue aprobada.`,
      ``,
      `Usuario: ${data.username}`,
      accessLine,
    ].join("\n")
  );
}

export async function sendPasswordResetEmail(data: {
  contactEmail: string;
  displayName: string;
  token: string;
}): Promise<void> {
  const config = getEmailConfig();
  const url = baseUrl();
  // Sin APP_BASE_URL configurado no hay forma de armar un link que sirva de verdad —
  // no tiene sentido mandar el mail (a diferencia de los otros mails, acá el link no es
  // opcional, es el mail entero).
  if (!config || !url) return;

  const resetUrl = `${url}/admin/restablecer-password?token=${data.token}`;

  await sendMail(
    config,
    data.contactEmail,
    `Restablecer contraseña — ${data.displayName}`,
    [
      `Pediste restablecer la contraseña de tu cuenta en Pakua Asistencias.`,
      ``,
      `Elegí una nueva acá (el link vence en 1 hora): ${resetUrl}`,
      ``,
      `Si no fuiste vos, podés ignorar este mail — tu contraseña actual sigue funcionando.`,
    ].join("\n")
  );
}

export async function sendEmailChangeCode(data: {
  contactEmail: string;
  displayName: string;
  code: string;
}): Promise<void> {
  const config = getEmailConfig();
  if (!config) return;

  await sendMail(
    config,
    data.contactEmail,
    `Código para confirmar tu nuevo mail — ${data.displayName}`,
    [
      `Pediste cambiar el mail de contacto de tu cuenta en Pakua Asistencias.`,
      ``,
      `Tu código de confirmación es: ${data.code}`,
      `Vence en 15 minutos.`,
      ``,
      `Si no fuiste vos, ignorá este mail — no se va a hacer ningún cambio sin este código.`,
    ].join("\n")
  );
}

export async function sendPasswordChangeCode(data: {
  contactEmail: string;
  displayName: string;
  code: string;
}): Promise<void> {
  const config = getEmailConfig();
  if (!config) return;

  await sendMail(
    config,
    data.contactEmail,
    `Código para confirmar tu nueva contraseña — ${data.displayName}`,
    [
      `Pediste cambiar la contraseña de tu cuenta en Pakua Asistencias.`,
      ``,
      `Tu código de confirmación es: ${data.code}`,
      `Vence en 15 minutos.`,
      ``,
      `Si no fuiste vos, ignorá este mail — tu contraseña actual sigue funcionando, no se va a cambiar sin este código.`,
    ].join("\n")
  );
}

export async function sendSubscriptionActivatedEmail(data: {
  contactEmail: string;
  displayName: string;
}): Promise<void> {
  const config = getEmailConfig();
  if (!config) return;

  const url = baseUrl();
  const billingLine = url ? `Ver el estado de tu suscripción: ${url}/admin/facturacion` : null;

  await sendMail(
    config,
    data.contactEmail,
    `Tu suscripción de "${data.displayName}" está activa`,
    [
      `¡Listo! Confirmamos tu pago y tu suscripción a Attendio ya está activa.`,
      ``,
      ...(billingLine ? [billingLine] : []),
    ].join("\n")
  );
}

export async function sendSubscriptionWarningEmail(data: {
  contactEmail: string;
  displayName: string;
  reason: "TRIAL_ENDING" | "PAYMENT_DUE" | "PAYMENT_FAILED";
}): Promise<void> {
  const config = getEmailConfig();
  if (!config) return;

  const url = baseUrl();
  const billingLine = url
    ? `Suscribite acá: ${url}/admin/facturacion`
    : `Entrá a "Facturación" en el panel para suscribirte.`;

  const MESSAGES: Record<typeof data.reason, string> = {
    TRIAL_ENDING: `Tu período de prueba en Attendio está por terminar en las próximas 12 horas. Si no te suscribís antes, tu panel va a quedar suspendido.`,
    PAYMENT_DUE: `Tu próximo cobro de Attendio es en las próximas 12 horas.`,
    PAYMENT_FAILED: `No pudimos procesar el último cobro de tu suscripción a Attendio. Tenés unos días de gracia antes de que se suspenda tu panel.`,
  };

  await sendMail(
    config,
    data.contactEmail,
    `Aviso sobre tu suscripción — ${data.displayName}`,
    [MESSAGES[data.reason], ``, billingLine].join("\n")
  );
}

export async function notifySchoolRejected(data: {
  contactEmail: string | null;
  displayName: string;
}): Promise<void> {
  const config = getEmailConfig();
  if (!config || !data.contactEmail) return;

  await sendMail(
    config,
    data.contactEmail,
    `Tu solicitud para "${data.displayName}" no fue aprobada`,
    [
      `Tu solicitud de alta para "${data.displayName}" no fue aprobada.`,
      `Si creés que fue un error o querés más información, podés responder este mail.`,
    ].join("\n")
  );
}
