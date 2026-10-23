import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";
import { alumnoArancelCreateSchema } from "@/lib/validations";
import { currentMonth } from "@/lib/aranceles-calc";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const student = await prisma.student.findUnique({ where: { id, adminId: session.adminId } });
  if (!student) {
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  }

  const month = request.nextUrl.searchParams.get("month") || currentMonth();

  const enrollments = await prisma.alumnoArancel.findMany({
    where: { studentId: id, active: true },
    include: { tipoArancel: true },
    orderBy: { tipoArancel: { name: "asc" } },
  });

  const payments = await prisma.pagoArancel.findMany({
    where: { studentId: id, month, tipoArancelId: { in: enrollments.map((e) => e.tipoArancelId) } },
  });
  const paidIds = new Set(payments.map((p) => p.tipoArancelId));

  return NextResponse.json({
    month,
    aranceles: enrollments.map((e) => ({
      id: e.id,
      tipoArancelId: e.tipoArancelId,
      name: e.tipoArancel.name,
      amount: e.tipoArancel.amount,
      active: e.tipoArancel.active,
      paid: paidIds.has(e.tipoArancelId),
    })),
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const student = await prisma.student.findUnique({ where: { id, adminId: session.adminId } });
  if (!student) {
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = alumnoArancelCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const tipo = await prisma.tipoArancel.findUnique({
    where: { id: parsed.data.tipoArancelId, adminId: session.adminId },
  });
  if (!tipo || !tipo.active) {
    return NextResponse.json({ error: "Tipo de arancel no encontrado" }, { status: 404 });
  }

  const existing = await prisma.alumnoArancel.findUnique({
    where: { studentId_tipoArancelId: { studentId: id, tipoArancelId: tipo.id } },
  });
  if (existing?.active) {
    return NextResponse.json({ error: "El alumno ya está anotado a ese arancel" }, { status: 400 });
  }

  const enrollment = existing
    ? await prisma.alumnoArancel.update({
        where: { id: existing.id },
        data: { active: true, startMonth: currentMonth() },
        include: { tipoArancel: true },
      })
    : await prisma.alumnoArancel.create({
        data: { studentId: id, tipoArancelId: tipo.id, startMonth: currentMonth() },
        include: { tipoArancel: true },
      });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "ENROLL_ALUMNO_ARANCEL",
    entity: "AlumnoArancel",
    entityId: enrollment.id,
    detail: `${student.lastName}, ${student.firstName} -> ${tipo.name}`,
  });

  return NextResponse.json({ enrollment }, { status: 201 });
}
