import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { graduationHistoryUpdateSchema } from "@/lib/validations";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";

type Params = { params: Promise<{ id: string; historyId: string }> };

// La fila de historial no tiene adminId propio, así que el aislamiento por escuela se hace
// vía la relación con Student (igual criterio de tenant-scoping que el resto del API, solo
// que acá pasa por un join en vez de un where plano).
async function loadEntry(studentId: string, historyId: string, adminId: string) {
  return prisma.studentGraduationHistory.findFirst({
    where: { id: historyId, studentId, student: { adminId } },
    include: { student: true },
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id: studentId, historyId } = await params;
  const existing = await loadEntry(studentId, historyId, session.adminId);
  if (!existing) {
    return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = graduationHistoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const entry = await prisma.studentGraduationHistory.update({
    where: { id: historyId },
    data: parsed.data,
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "UPDATE_GRADUATION_HISTORY",
    entity: "StudentGraduationHistory",
    entityId: entry.id,
    detail: `${existing.student.firstName} ${existing.student.lastName} — ${entry.graduacion}`,
  });

  return NextResponse.json({ entry });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id: studentId, historyId } = await params;
  const existing = await loadEntry(studentId, historyId, session.adminId);
  if (!existing) {
    return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
  }

  await prisma.studentGraduationHistory.delete({ where: { id: historyId } });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "DELETE_GRADUATION_HISTORY",
    entity: "StudentGraduationHistory",
    entityId: historyId,
    detail: `${existing.student.firstName} ${existing.student.lastName} — ${existing.graduacion}`,
  });

  return NextResponse.json({ ok: true });
}
