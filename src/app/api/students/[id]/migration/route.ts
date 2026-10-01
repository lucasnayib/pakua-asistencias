import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";
import { generateVerificationCode } from "@/lib/verification-code";
import { STUDENT_MIGRATION_DURATION_DAYS, hashMigrationCode } from "@/lib/student-migration";

type Params = { params: Promise<{ id: string }> };

/** Lado ORIGEN: liberar/consultar/cancelar la migración de un alumno propio a otra escuela. */
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const student = await prisma.student.findUnique({ where: { id, adminId: session.adminId } });
  if (!student) {
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  }

  const pending = await prisma.studentMigration.findFirst({
    where: { studentId: id, status: "PENDING", expiresAt: { gt: new Date() } },
    select: { expiresAt: true },
  });

  return NextResponse.json({ pending: !!pending, expiresAt: pending?.expiresAt ?? null });
}

export async function POST(_request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const student = await prisma.student.findUnique({ where: { id, adminId: session.adminId } });
  if (!student) {
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  }
  if (!student.active) {
    return NextResponse.json({ error: "El alumno está dado de baja" }, { status: 400 });
  }

  const existing = await prisma.studentMigration.findFirst({
    where: { studentId: id, status: "PENDING", expiresAt: { gt: new Date() } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Ya hay un código de migración pendiente para este alumno. Cancelalo antes de generar uno nuevo." },
      { status: 409 }
    );
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + STUDENT_MIGRATION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.studentMigration.create({
    data: { studentId: id, codeHash: hashMigrationCode(code), expiresAt },
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "RELEASE_STUDENT_MIGRATION",
    entity: "Student",
    entityId: id,
    detail: `${student.firstName} ${student.lastName}`,
  });

  // El código en texto plano se devuelve una única vez acá: no se guarda en ningún lado
  // (solo su hash), así que no se puede volver a consultar después de este response.
  return NextResponse.json({ code, expiresAt }, { status: 201 });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const student = await prisma.student.findUnique({ where: { id, adminId: session.adminId } });
  if (!student) {
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  }

  const pending = await prisma.studentMigration.findFirst({ where: { studentId: id, status: "PENDING" } });
  if (!pending) {
    return NextResponse.json({ error: "No hay ninguna migración pendiente para cancelar" }, { status: 404 });
  }

  await prisma.studentMigration.update({ where: { id: pending.id }, data: { status: "CANCELED" } });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "CANCEL_STUDENT_MIGRATION",
    entity: "Student",
    entityId: id,
    detail: `${student.firstName} ${student.lastName}`,
  });

  return NextResponse.json({ ok: true });
}
