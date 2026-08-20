import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assignmentSchema } from "@/lib/validations";
import { getSession } from "@/lib/auth";
import { logChange } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = assignmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { studentId, scheduleId } = parsed.data;

  const [student, schedule] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId } }),
    prisma.schedule.findUnique({ where: { id: scheduleId } }),
  ]);
  if (!student || !schedule) {
    return NextResponse.json({ error: "Alumno u horario no encontrado" }, { status: 404 });
  }

  const assignment = await prisma.studentSchedule.upsert({
    where: { studentId_scheduleId: { studentId, scheduleId } },
    update: {},
    create: { studentId, scheduleId },
  });

  const session = await getSession();
  await logChange({
    actor: session?.username ?? "admin",
    action: "ASSIGN_STUDENT",
    entity: "StudentSchedule",
    entityId: assignment.id,
    detail: `${student.firstName} ${student.lastName} → ${schedule.name ?? ""} ${schedule.startTime}-${schedule.endTime}`.trim(),
  });

  return NextResponse.json({ assignment }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = assignmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { studentId, scheduleId } = parsed.data;

  const [student, schedule] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId } }),
    prisma.schedule.findUnique({ where: { id: scheduleId } }),
  ]);

  await prisma.studentSchedule.deleteMany({ where: { studentId, scheduleId } });

  const session = await getSession();
  await logChange({
    actor: session?.username ?? "admin",
    action: "UNASSIGN_STUDENT",
    entity: "StudentSchedule",
    detail: `${student?.firstName ?? studentId} ${student?.lastName ?? ""} ↛ ${schedule?.name ?? scheduleId}`.trim(),
  });

  return NextResponse.json({ ok: true });
}
