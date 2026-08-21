import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/school-access";
import { logChange } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const attendance = await prisma.attendance.findUnique({
    where: { id },
    include: { student: true, schedule: true },
  });
  if (!attendance) {
    return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
  }

  const access = await requireSchoolAccess(attendance.schedule.adminId);
  if (access instanceof NextResponse) return access;

  await prisma.attendance.delete({ where: { id } });

  await logChange({
    actor: "profesor",
    action: "UNMARK_ATTENDANCE",
    entity: "Attendance",
    entityId: id,
    detail: `${attendance.student.firstName} ${attendance.student.lastName} — ${attendance.date}`,
  });

  return NextResponse.json({ ok: true });
}
