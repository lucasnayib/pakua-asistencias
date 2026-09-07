import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { itineranciaActivityUpsertSchema } from "@/lib/validations";
import { requireItineranciaAdminAccess } from "@/lib/itinerancias";
import { logChange } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

const registrationCounts = {
  _count: { select: { studentRegistrations: true, orientadorRegistrations: true } },
} as const;

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const denied = await requireItineranciaAdminAccess(session.adminId);
  if (denied) return denied;

  const { id } = await params;
  const existing = await prisma.itineranciaActivity.findUnique({ where: { id, adminId: session.adminId } });
  if (!existing) {
    return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = itineranciaActivityUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const activity = await prisma.itineranciaActivity.update({
    where: { id, adminId: session.adminId },
    data: parsed.data,
    include: registrationCounts,
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "UPDATE_ITINERANCIA_ACTIVITY",
    entity: "ItineranciaActivity",
    entityId: activity.id,
    detail: activity.title,
  });

  return NextResponse.json({ activity });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const denied = await requireItineranciaAdminAccess(session.adminId);
  if (denied) return denied;

  const { id } = await params;
  const existing = await prisma.itineranciaActivity.findUnique({ where: { id, adminId: session.adminId } });
  if (!existing) {
    return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
  }

  await prisma.itineranciaActivity.delete({ where: { id, adminId: session.adminId } });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "DELETE_ITINERANCIA_ACTIVITY",
    entity: "ItineranciaActivity",
    entityId: id,
    detail: existing.title,
  });

  return NextResponse.json({ ok: true });
}
