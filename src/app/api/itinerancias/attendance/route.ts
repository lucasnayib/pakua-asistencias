import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { itineranciaRegisterSchema } from "@/lib/validations";
import { requireItineranciaAccess } from "@/lib/itinerancia-access";
import { isItineranciasOpen, isItineranciasSchool } from "@/lib/itinerancias";
import { getLocalNow } from "@/lib/time";
import { logChange } from "@/lib/audit";

/**
 * Auto-check-in de Itinerancias, separado de la inscripción (register/route.ts): acá el alumno
 * ya inscripto se marca presente el día de la actividad, igual que hace en /escuela/[slug] para
 * las clases normales. Solo actividades de HOY, para no poder marcarse presente en actividades
 * pasadas o futuras.
 */
export async function GET(request: NextRequest) {
  const adminId = request.nextUrl.searchParams.get("adminId");
  if (!adminId) {
    return NextResponse.json({ error: "Falta adminId" }, { status: 400 });
  }

  const access = await requireItineranciaAccess(adminId);
  if (access instanceof NextResponse) return access;

  const admin = await prisma.admin.findUnique({ where: { id: adminId }, select: { slug: true } });
  if (!isItineranciasSchool(admin?.slug) || !isItineranciasOpen()) {
    return NextResponse.json({ error: "Itinerancias no está disponible ahora" }, { status: 404 });
  }

  const today = getLocalNow().date;
  const activities = await prisma.itineranciaActivity.findMany({
    where: { adminId, date: today },
    include: {
      studentRegistrations: {
        include: { student: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } },
        orderBy: { student: { lastName: "asc" } },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json({
    activities: activities.map((a) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      students: a.studentRegistrations.map((r) => ({
        id: r.student.id,
        firstName: r.student.firstName,
        lastName: r.student.lastName,
        photoUrl: r.student.photoUrl,
        attended: r.attendedAt !== null,
      })),
    })),
  });
}

async function loadRegistration(activityId: string, studentId: string) {
  const activity = await prisma.itineranciaActivity.findUnique({ where: { id: activityId } });
  if (!activity) return { error: NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 }) } as const;

  const access = await requireItineranciaAccess(activity.adminId);
  if (access instanceof NextResponse) return { error: access } as const;

  const admin = await prisma.admin.findUnique({ where: { id: activity.adminId }, select: { slug: true } });
  if (!isItineranciasSchool(admin?.slug) || !isItineranciasOpen()) {
    return {
      error: NextResponse.json({ error: "Itinerancias no está disponible ahora" }, { status: 404 }),
    } as const;
  }

  if (activity.date !== getLocalNow().date) {
    return {
      error: NextResponse.json({ error: "Solo se puede marcar asistencia el día de la actividad" }, { status: 400 }),
    } as const;
  }

  const registration = await prisma.itineranciaStudentRegistration.findUnique({
    where: { activityId_studentId: { activityId, studentId } },
    include: { student: true },
  });
  if (!registration) {
    return { error: NextResponse.json({ error: "No estás inscripto a esta actividad" }, { status: 404 }) } as const;
  }

  return { activity, registration } as const;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = itineranciaRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { activityId, studentId } = parsed.data;

  const result = await loadRegistration(activityId, studentId);
  if ("error" in result) return result.error;
  const { activity, registration } = result;

  if (registration.attendedAt === null) {
    await prisma.itineranciaStudentRegistration.update({
      where: { id: registration.id },
      data: { attendedAt: new Date() },
    });

    await logChange({
      actor: "alumno",
      adminId: activity.adminId,
      action: "CHECKIN_ITINERANCIA",
      entity: "ItineranciaActivity",
      entityId: activityId,
      detail: `${registration.student.firstName} ${registration.student.lastName} — ${activity.title}`,
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = itineranciaRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { activityId, studentId } = parsed.data;

  const result = await loadRegistration(activityId, studentId);
  if ("error" in result) return result.error;
  const { activity, registration } = result;

  if (registration.attendedAt !== null) {
    await prisma.itineranciaStudentRegistration.update({
      where: { id: registration.id },
      data: { attendedAt: null },
    });

    await logChange({
      actor: "alumno",
      adminId: activity.adminId,
      action: "UNCHECKIN_ITINERANCIA",
      entity: "ItineranciaActivity",
      entityId: activityId,
      detail: `${registration.student.firstName} ${registration.student.lastName} — ${activity.title}`,
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
