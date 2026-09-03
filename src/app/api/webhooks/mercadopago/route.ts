import { NextResponse } from "next/server";
import { PreApproval, WebhookSignatureValidator, InvalidWebhookSignatureError } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { getMpClient } from "@/lib/mercadopago";
import { sendSubscriptionActivatedEmail, sendSubscriptionWarningEmail } from "@/lib/email";

/**
 * Notificación pública de Mercado Pago (sin sesión). Nunca se agrega a
 * isAdminOnlyApiRoute en proxy.ts — Mercado Pago no manda ninguna cookie nuestra.
 *
 * Nunca se confía en el payload del webhook a ciegas: solo se usa para saber QUÉ recurso
 * mirar, y después se pide el estado real con un GET autenticado a la API.
 */
export async function POST(request: Request) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook mercadopago] Falta MP_WEBHOOK_SECRET");
    return NextResponse.json({ error: "No configurado" }, { status: 500 });
  }

  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
      secret,
      toleranceSeconds: 5 * 60,
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      console.warn("[webhook mercadopago] Firma inválida:", error.reason);
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }
    throw error;
  }

  const body = await request.json().catch(() => null);
  const type = url.searchParams.get("type") ?? body?.type ?? body?.topic;

  // Solo nos interesan las notificaciones de la suscripción en sí. Los estados que importan
  // (authorized / paused / cancelled) se reflejan en el propio recurso preapproval — ver
  // handlePreapproval() para el detalle de qué representa cada uno.
  if (type === "preapproval" && dataId) {
    await handlePreapproval(dataId);
  }

  // Siempre 200 con firma válida: si no, Mercado Pago reintenta indefinidamente.
  return NextResponse.json({ ok: true });
}

async function handlePreapproval(preapprovalId: string): Promise<void> {
  const preApproval = new PreApproval(getMpClient());
  const resource = await preApproval.get({ id: preapprovalId });

  const adminId = resource.external_reference;
  const admin = adminId
    ? await prisma.admin.findUnique({ where: { id: adminId } })
    : await prisma.admin.findFirst({ where: { mpPreapprovalId: preapprovalId } });

  if (!admin) {
    console.warn("[webhook mercadopago] No se encontró el Admin para preapproval", preapprovalId);
    return;
  }

  if (resource.status === "authorized") {
    const wasActive = admin.subscriptionStatus === "ACTIVE";
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        subscriptionStatus: "ACTIVE",
        active: true,
        currentPeriodEnd: resource.next_payment_date ? new Date(resource.next_payment_date) : null,
        graceEndsAt: null,
        periodWarningSentAt: null,
        mpPreapprovalId: preapprovalId,
      },
    });
    if (!wasActive && admin.contactEmail) {
      await sendSubscriptionActivatedEmail({ contactEmail: admin.contactEmail, displayName: admin.displayName });
    }
    return;
  }

  if (resource.status === "cancelled") {
    await prisma.admin.update({
      where: { id: admin.id },
      data: { subscriptionStatus: "CANCELED" },
    });
    return;
  }

  // "paused": es como Mercado Pago marca una suscripción cuyo cobro recurrente falló.
  // Solo importa como una degradación real si veníamos de ACTIVE — un "paused" sobre algo
  // que nunca llegó a autorizarse (ej. todavía "pending") no debe mandar a PAST_DUE.
  if (resource.status === "paused" && admin.subscriptionStatus === "ACTIVE") {
    const graceDays = Number(process.env.SUBSCRIPTION_GRACE_DAYS ?? "2");
    const graceEndsAt = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { subscriptionStatus: "PAST_DUE", graceEndsAt },
    });
    if (admin.contactEmail) {
      await sendSubscriptionWarningEmail({
        contactEmail: admin.contactEmail,
        displayName: admin.displayName,
        reason: "PAYMENT_FAILED",
      });
    }
  }
}
