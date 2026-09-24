import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { graduationHistoryCreateSchema } from "@/lib/validations";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id: studentId } = await params;
  const student = await prisma.student.findUnique({ where: { id: studentId, adminId: session.adminId } });
  if (!student) {
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = graduationHistoryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const entry = await prisma.studentGraduationHistory.create({
    data: { studentId, ...parsed.data },
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "ADD_GRADUATION_HISTORY",
    entity: "StudentGraduationHistory",
    entityId: entry.id,
    detail: `${student.firstName} ${student.lastName} — ${entry.graduacion}`,
  });

  return NextResponse.json({ entry }, { status: 201 });
}
