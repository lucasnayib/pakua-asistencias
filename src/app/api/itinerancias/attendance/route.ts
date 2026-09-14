import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { itineranciaAttendanceMarkSchema } from "@/lib/validations";
import { requireItineranciaAccess } from "@/lib/itinerancia-access";
import {
  checkItineranciaLocation,
  isItineranciasOpen,
  isItineranciasSchool,
  itineranciaRequiresLocation,
} from "@/lib/itinerancias";
import { logChange } from "@/lib/audit";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Auto-check-in de Itinerancias, separado de la inscripción (register/route.ts): acá el alumno
 * ya inscripto se marca presente el día de la actividad, igual que hace en /escuela/[slug] para
 * las clases normales. También permite ver/marcar días anteriores (por si se olvidaron marcar
 * la asistencia en su momento), pero no días futuros.
 *
 * La fecha ("date" acá, "clientDate" en POST/DELETE) siempre la calcula y manda el cliente
 * (ver getLocalNow() en @/lib/time), nunca el servidor: si se calculara acá, el resultado
 * dependería de la zona horaria del server (típicamente UTC en producción), no de la del
 * alumno — de ahí el bug de "me muestra las clases de mañana" cuando el server ya cruzó la
 * medianoche en UTC pero localmente todavía es "hoy".
 */
export async function GET(request: NextRequest) {
  const adminId = request.nextUrl.searchParams.get("adminId");
  const date = request.nextUrl.searchParams.get("date");
  if (!adminId) {
    return NextResponse.json({ error: "Falta adminId" }, { status: 400 });
  }
  if (!date || !dateRegex.test(date)) {
    return NextResponse.json({ error: "Falta o es inválida la fecha" }, { status: 400 });
  }

  const access = await requireItineranciaAccess(adminId);
  if (access instanceof NextResponse) return access;

  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { slug: true, latitude: true, longitude: true, attendanceRadiusMeters: true },
  });
  if (!isItineranciasSchool(admin?.slug) || !isItineranciasOpen()) {
    return NextResponse.json({ error: "Itinerancias no está disponible ahora" }, { status: 404 });
  }

  const activities = await prisma.itineranciaActivity.findMany({
    where: { adminId, date },
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
      location: a.location,
      requiresLocation: itineranciaRequiresLocation(admin!, a.location),
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

async function loadRegistration(activityId: string, studentId: string, clientDate: string) {
  const activity = await prisma.itineranciaActivity.findUnique({ where: { id: activityId } });
  if (!activity) return { error: NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 }) } as const;

  const access = await requireItineranciaAccess(activity.adminId);
  if (access instanceof NextResponse) return { error: access } as const;

  const admin = await prisma.admin.findUnique({
    where: { id: activity.adminId },
    select: { slug: true, latitude: true, longitude: true, attendanceRadiusMeters: true },
  });
  if (!isItineranciasSchool(admin?.slug) || !isItineranciasOpen()) {
    return {
      error: NextResponse.json({ error: "Itinerancias no está disponible ahora" }, { status: 404 }),
    } as const;
  }

  // Se puede marcar asistencia el día de la actividad o cualquier día posterior (por si se
  // olvidaron marcarla en su momento); nunca para una actividad que todavía no pasó.
  if (activity.date > clientDate) {
    return {
      error: NextResponse.json({ error: "Todavía no se puede marcar asistencia: la actividad es a futuro" }, { status: 400 }),
    } as const;
  }

  const registration = await prisma.itineranciaStudentRegistration.findUnique({
    where: { activityId_studentId: { activityId, studentId } },
    include: { student: true },
  });
  if (!registration) {
    return { error: NextResponse.json({ error: "No estás inscripto a esta actividad" }, { status: 404 }) } as const;
  }

  return { activity, registration, admin } as const;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = itineranciaAttendanceMarkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { activityId, studentId, clientDate, latitude, longitude } = parsed.data;

  const result = await loadRegistration(activityId, studentId, clientDate);
  if ("error" in result) return result.error;
  const { activity, registration, admin } = result;

  // La ubicación solo se exige para marcar presente EN EL MOMENTO (el día de la actividad), no
  // para corregir retroactivamente un día anterior que ya pasó — igual criterio que la
  // asistencia normal en /api/attendance.
  const isForToday = activity.date === clientDate;
  if (registration.attendedAt === null && isForToday && admin && itineranciaRequiresLocation(admin, activity.location)) {
    const locationError = checkItineranciaLocation(admin, latitude, longitude);
    if (locationError) return NextResponse.json({ error: locationError.error }, { status: locationError.status });
  }

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
  const parsed = itineranciaAttendanceMarkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { activityId, studentId, clientDate } = parsed.data;

  const result = await loadRegistration(activityId, studentId, clientDate);
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
