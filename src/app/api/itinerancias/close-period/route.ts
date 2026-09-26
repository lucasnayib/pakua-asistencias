import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { itineranciaClosePeriodSchema } from "@/lib/validations";
import { requireItineranciaAdminAccess } from "@/lib/itinerancias";
import { logChange } from "@/lib/audit";

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const denied = await requireItineranciaAdminAccess(session.adminId);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = itineranciaClosePeriodSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const result = await prisma.itineranciaActivity.updateMany({
    where: { adminId: session.adminId, period: null },
    data: { period: parsed.data.label },
  });

  if (result.count > 0) {
    await logChange({
      actor: session.displayName,
      adminId: session.adminId,
      action: "CLOSE_ITINERANCIA_PERIOD",
      entity: "ItineranciaActivity",
      detail: `${parsed.data.label} (${result.count} actividad(es))`,
    });
  }

  return NextResponse.json({ archivedCount: result.count });
}
