import { NextResponse } from "next/server";
import { PreApproval } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getMpClient } from "@/lib/mercadopago";
import { logChange } from "@/lib/audit";

export async function POST() {
  if (process.env.SUBSCRIPTIONS_ENABLED !== "true") {
    return NextResponse.json({ error: "Las suscripciones no están habilitadas" }, { status: 404 });
  }

  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const admin = await prisma.admin.findUnique({ where: { id: session.adminId } });
  if (!admin?.mpPreapprovalId) {
    return NextResponse.json({ error: "No encontramos una suscripción activa para cancelar" }, { status: 400 });
  }

  try {
    await new PreApproval(getMpClient()).update({
      id: admin.mpPreapprovalId,
      body: { status: "cancelled" },
    });
  } catch (error) {
    console.error("[subscription/cancel] Error cancelando en Mercado Pago:", error);
    return NextResponse.json({ error: "No se pudo cancelar la suscripción" }, { status: 502 });
  }

  // No esperamos al webhook para reflejarlo: el corte del cobro automático ya quedó
  // confirmado en Mercado Pago, así que actualizamos acá mismo para que el panel lo
  // muestre al instante. El webhook, cuando llegue, va a encontrar el mismo estado.
  await prisma.admin.update({
    where: { id: admin.id },
    data: { subscriptionStatus: "CANCELED" },
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "CANCEL_SUBSCRIPTION",
    entity: "Admin",
    entityId: admin.id,
    detail: admin.displayName,
  });

  return NextResponse.json({ ok: true });
}
