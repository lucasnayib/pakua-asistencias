import { NextResponse } from "next/server";
import { PreApproval } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getMpClient } from "@/lib/mercadopago";

export async function POST() {
  if (process.env.SUBSCRIPTIONS_ENABLED !== "true") {
    return NextResponse.json({ error: "Las suscripciones no están habilitadas" }, { status: 404 });
  }

  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const admin = await prisma.admin.findUnique({ where: { id: session.adminId } });
  if (!admin?.contactEmail) {
    return NextResponse.json(
      { error: "Necesitás tener un mail de contacto cargado antes de suscribirte (ver 'Mi cuenta')" },
      { status: 400 }
    );
  }

  // Se crea el preapproval directo por API (sin card_token_id ni preapproval_plan_id) en vez
  // de redirigir al init_point fijo del plan: ese link fijo IGNORA por completo los query
  // params external_reference/payer_email (confirmado contra la API real), así que el webhook
  // nunca puede saber a qué escuela pertenece el pago. Creándolo así, cada preapproval tiene
  // su propio init_point de checkout alojado, y sí conserva external_reference.
  let initPoint: string;
  try {
    const preapproval = await new PreApproval(getMpClient()).create({
      body: {
        payer_email: admin.contactEmail,
        external_reference: admin.id,
        back_url: `${process.env.APP_BASE_URL}/admin/facturacion`,
        reason: "Attendio - Plan Único",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: Number(process.env.SUBSCRIPTION_PRICE_ARS ?? "0"),
          currency_id: "ARS",
        },
      },
    });
    if (!preapproval.init_point) throw new Error("La suscripción no tiene init_point");
    initPoint = preapproval.init_point;
  } catch (error) {
    console.error("[subscription/checkout] Error creando la suscripción:", error);
    return NextResponse.json({ error: "No se pudo iniciar la suscripción" }, { status: 502 });
  }

  return NextResponse.json({ init_point: initPoint });
}
