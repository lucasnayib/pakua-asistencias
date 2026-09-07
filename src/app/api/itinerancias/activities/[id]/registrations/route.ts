import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { requireItineranciaAdminAccess } from "@/lib/itinerancias";
import { logChange } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

async function loadActivity(id: string, adminId: string) {
  return prisma.itineranciaActivity.findUnique({
    where: { id, adminId },
    include: {
      studentRegistrations: { include: { student: true }, orderBy: { student: { lastName: "asc" } } },
      orientadorRegistrations: { include: { orientador: true }, orderBy: { orientador: { lastName: "asc" } } },
    },
  });
}

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const denied = await requireItineranciaAdminAccess(session.adminId);
  if (denied) return denied;

  const { id } = await params;
  const activity = await loadActivity(id, session.adminId);
  if (!activity) {
    return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    students: activity.studentRegistrations.map((r) => r.student),
    orientadores: activity.orientadorRegistrations.map((r) => r.orientador),
  });
}

/** Corrección manual del admin: es la única forma de deshacer una inscripción (ver plan). */
export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const denied = await requireItineranciaAdminAccess(session.adminId);
  if (denied) return denied;

  const { id } = await params;
  const activity = await prisma.itineranciaActivity.findUnique({ where: { id, adminId: session.adminId } });
  if (!activity) {
    return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const personType = body?.personType;
  const personId = body?.personId;
  if ((personType !== "STUDENT" && personType !== "ORIENTADOR") || typeof personId !== "string" || !personId) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  if (personType === "STUDENT") {
    await prisma.itineranciaStudentRegistration.deleteMany({ where: { activityId: id, studentId: personId } });
  } else {
    await prisma.itineranciaOrientadorRegistration.deleteMany({ where: { activityId: id, orientadorId: personId } });
  }

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "REMOVE_ITINERANCIA_REGISTRATION",
    entity: "ItineranciaActivity",
    entityId: id,
    detail: `${personType} ${personId}`,
  });

  return NextResponse.json({ ok: true });
}
