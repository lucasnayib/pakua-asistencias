import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { itineranciaActivityUpsertSchema } from "@/lib/validations";
import { requireItineranciaAdminAccess } from "@/lib/itinerancias";
import { logChange } from "@/lib/audit";

const registrationCounts = {
  _count: { select: { studentRegistrations: true, orientadorRegistrations: true } },
} as const;

export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const denied = await requireItineranciaAdminAccess(session.adminId);
  if (denied) return denied;

  const activities = await prisma.itineranciaActivity.findMany({
    where: { adminId: session.adminId },
    include: registrationCounts,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json({ activities });
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const denied = await requireItineranciaAdminAccess(session.adminId);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = itineranciaActivityUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const activity = await prisma.itineranciaActivity.create({
    data: { ...parsed.data, adminId: session.adminId },
    include: registrationCounts,
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "CREATE_ITINERANCIA_ACTIVITY",
    entity: "ItineranciaActivity",
    entityId: activity.id,
    detail: activity.title,
  });

  return NextResponse.json({ activity }, { status: 201 });
}
