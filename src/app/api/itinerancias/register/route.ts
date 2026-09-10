import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { itineranciaRegisterSchema } from "@/lib/validations";
import { requireItineranciaAccess } from "@/lib/itinerancia-access";
import { isItineranciasOpen, isItineranciasSchool } from "@/lib/itinerancias";
import { logChange } from "@/lib/audit";

/**
 * Inscripción pública de un alumno a una actividad de Itinerancias. Solo POST: es irrevocable
 * desde este lado (ver plan) — la única forma de deshacerla es la corrección manual del admin
 * en /api/itinerancias/activities/[id]/registrations.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = itineranciaRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { activityId, studentId } = parsed.data;

  const activity = await prisma.itineranciaActivity.findUnique({ where: { id: activityId } });
  if (!activity) {
    return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
  }

  const access = await requireItineranciaAccess(activity.adminId);
  if (access instanceof NextResponse) return access;

  const admin = await prisma.admin.findUnique({ where: { id: activity.adminId }, select: { slug: true } });
  if (!isItineranciasSchool(admin?.slug) || !isItineranciasOpen()) {
    return NextResponse.json({ error: "Itinerancias no está disponible ahora" }, { status: 404 });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.adminId !== activity.adminId || !student.active) {
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  }

  try {
    await prisma.itineranciaStudentRegistration.create({ data: { activityId, studentId } });
  } catch {
    return NextResponse.json({ error: "Ya estabas anotado a esta actividad" }, { status: 409 });
  }

  await logChange({
    actor: "alumno",
    adminId: activity.adminId,
    action: "REGISTER_ITINERANCIA",
    entity: "ItineranciaActivity",
    entityId: activityId,
    detail: `${student.firstName} ${student.lastName} — ${activity.title}`,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
