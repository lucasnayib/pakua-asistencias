import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attendanceCreateSchema } from "@/lib/validations";
import { requireSchoolAccess } from "@/lib/school-access";
import { logChange } from "@/lib/audit";
import { distanceMeters } from "@/lib/geo";
import { getLocalNow } from "@/lib/time";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = attendanceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { studentId, scheduleId, date, time, latitude, longitude } = parsed.data;

  const [student, schedule] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId } }),
    prisma.schedule.findUnique({ where: { id: scheduleId } }),
  ]);
  if (!student || !schedule || student.adminId !== schedule.adminId) {
    return NextResponse.json({ error: "Alumno u horario no encontrado" }, { status: 404 });
  }

  const access = await requireSchoolAccess(schedule.adminId);
  if (access instanceof NextResponse) return access;

  const admin = await prisma.admin.findUnique({
    where: { id: schedule.adminId },
    select: { latitude: true, longitude: true, attendanceRadiusMeters: true },
  });

  // Si la escuela configuró una ubicación, la asistencia EN TIEMPO REAL (fecha de hoy) solo
  // se puede marcar estando dentro del radio permitido. No aplica a correcciones retroactivas
  // de días anteriores (pantalla "clases anteriores"), donde no tiene sentido pedir GPS.
  // La validación se hace acá, en el servidor — nunca hay que confiar en que el cliente no
  // haya falseado las coordenadas.
  const isToday = date === getLocalNow().date;
  if (isToday && admin?.latitude != null && admin.longitude != null && admin.attendanceRadiusMeters != null) {
    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: "Esta escuela requiere ubicación para marcar asistencia" },
        { status: 400 }
      );
    }
    const distance = distanceMeters(admin.latitude, admin.longitude, latitude, longitude);
    if (distance > admin.attendanceRadiusMeters) {
      return NextResponse.json(
        { error: "No estás dentro del rango permitido de la escuela para marcar asistencia" },
        { status: 403 }
      );
    }
  }

  const attendance = await prisma.attendance.upsert({
    where: { studentId_scheduleId_date: { studentId, scheduleId, date } },
    update: { time, status: "PRESENTE" },
    create: { studentId, scheduleId, date, time, status: "PRESENTE" },
  });

  await logChange({
    actor: "profesor",
    action: "MARK_ATTENDANCE",
    entity: "Attendance",
    entityId: attendance.id,
    detail: `${student.firstName} ${student.lastName} — ${date} ${time}`,
  });

  return NextResponse.json({ attendance }, { status: 201 });
}
