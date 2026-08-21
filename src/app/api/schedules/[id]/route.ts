import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleSchema } from "@/lib/validations";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const existing = await prisma.schedule.findUnique({ where: { id, adminId: session.adminId } });
  if (!existing) {
    return NextResponse.json({ error: "Horario no encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const { name, startTime, endTime, days } = parsed.data;
  const schedule = await prisma.$transaction(async (tx) => {
    await tx.scheduleDay.deleteMany({ where: { scheduleId: id } });
    return tx.schedule.update({
      where: { id, adminId: session.adminId },
      data: {
        name: name || null,
        startTime,
        endTime,
        days: { create: days.map((dayOfWeek) => ({ dayOfWeek })) },
      },
      include: { days: true },
    });
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "UPDATE_SCHEDULE",
    entity: "Schedule",
    entityId: schedule.id,
    detail: `${schedule.name ?? ""} ${schedule.startTime}-${schedule.endTime}`.trim(),
  });

  return NextResponse.json({ schedule });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const existing = await prisma.schedule.findUnique({ where: { id, adminId: session.adminId } });
  if (!existing) {
    return NextResponse.json({ error: "Horario no encontrado" }, { status: 404 });
  }

  const attendanceCount = await prisma.attendance.count({ where: { scheduleId: id } });
  if (attendanceCount > 0) {
    return NextResponse.json(
      {
        error:
          "Este horario tiene historial de asistencias registradas y no puede eliminarse. Quitá los alumnos asignados si ya no dictás esta clase.",
      },
      { status: 409 }
    );
  }

  await prisma.schedule.delete({ where: { id, adminId: session.adminId } });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "DELETE_SCHEDULE",
    entity: "Schedule",
    entityId: id,
    detail: `${existing.name ?? ""} ${existing.startTime}-${existing.endTime}`.trim(),
  });

  return NextResponse.json({ ok: true });
}
