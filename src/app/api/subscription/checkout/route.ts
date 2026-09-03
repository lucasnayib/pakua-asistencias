import { NextResponse } from "next/server";
import { PreApprovalPlan } from "mercadopago";
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

  // No se crea el preapproval acá: para un plan único, el checkout alojado de Mercado Pago
  // se arma redirigiendo directo al init_point DEL PLAN (no llamando a PreApproval.create,
  // que exige card_token_id — eso es para autorizar el cobro nosotros mismos, no para el
  // flujo de checkout alojado). El preapproval real lo crea Mercado Pago recién cuando el
  // comprador completa el checkout, y ahí nos enteramos por el webhook.
  let planInitPoint: string;
  try {
    const plan = await new PreApprovalPlan(getMpClient()).get({ preApprovalPlanId: process.env.MP_PLAN_ID! });
    if (!plan.init_point) throw new Error("El plan no tiene init_point");
    planInitPoint = plan.init_point;
  } catch (error) {
    console.error("[subscription/checkout] Error obteniendo el plan:", error);
    return NextResponse.json({ error: "No se pudo iniciar la suscripción" }, { status: 502 });
  }

  const checkoutUrl = new URL(planInitPoint);
  checkoutUrl.searchParams.set("external_reference", admin.id);
  checkoutUrl.searchParams.set("payer_email", admin.contactEmail);

  return NextResponse.json({ init_point: checkoutUrl.toString() });
}
