import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attendanceCreateSchema } from "@/lib/validations";
import { requireSchoolAccess } from "@/lib/school-access";
import { logChange } from "@/lib/audit";
import { isOutsidePublicHours, getPublicHoursWindow } from "@/lib/business-hours";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = attendanceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { studentId, scheduleId, date, time } = parsed.data;

  const [student, schedule] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId } }),
    prisma.schedule.findUnique({ where: { id: scheduleId } }),
  ]);
  if (!student || !schedule || student.adminId !== schedule.adminId) {
    return NextResponse.json({ error: "Alumno u horario no encontrado" }, { status: 404 });
  }

  const access = await requireSchoolAccess(schedule.adminId);
  if (access instanceof NextResponse) return access;

  // Defensa en profundidad: la página pública ya se cierra sola (ver isOutsidePublicHours()
  // en los Server Components de /escuela/[slug]), pero esto cubre una pestaña que ya estaba
  // abierta antes del cierre y todavía intenta marcar asistencia por acá directamente.
  if (isOutsidePublicHours()) {
    const { open, close } = getPublicHoursWindow();
    return NextResponse.json(
      { error: `La página está cerrada en este horario. Disponible de ${open} a ${close}.` },
      { status: 403 }
    );
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
