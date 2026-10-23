import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";
import { pagoArancelMarkPaidSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string; alumnoArancelId: string }> };

async function loadEnrollment(id: string, alumnoArancelId: string, adminId: string) {
  const enrollment = await prisma.alumnoArancel.findUnique({
    where: { id: alumnoArancelId },
    include: { student: true, tipoArancel: true },
  });
  if (!enrollment || enrollment.studentId !== id || enrollment.student.adminId !== adminId) return null;
  return enrollment;
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id, alumnoArancelId } = await params;
  const enrollment = await loadEnrollment(id, alumnoArancelId, session.adminId);
  if (!enrollment) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = pagoArancelMarkPaidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  // Monto vigente del tipo de arancel al momento de pagar: si después sube la cuota, lo ya
  // pagado no cambia retroactivamente.
  const pago = await prisma.pagoArancel.upsert({
    where: {
      studentId_tipoArancelId_month: {
        studentId: id,
        tipoArancelId: enrollment.tipoArancelId,
        month: parsed.data.month,
      },
    },
    update: {},
    create: {
      studentId: id,
      tipoArancelId: enrollment.tipoArancelId,
      adminId: session.adminId,
      month: parsed.data.month,
      amount: enrollment.tipoArancel.amount,
    },
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "MARK_ARANCEL_PAID",
    entity: "PagoArancel",
    entityId: pago.id,
    detail: `${enrollment.student.lastName}, ${enrollment.student.firstName} -> ${enrollment.tipoArancel.name} (${parsed.data.month})`,
  });

  return NextResponse.json({ pago }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id, alumnoArancelId } = await params;
  const enrollment = await loadEnrollment(id, alumnoArancelId, session.adminId);
  if (!enrollment) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const month = request.nextUrl.searchParams.get("month");
  const parsed = pagoArancelMarkPaidSchema.safeParse({ month });
  if (!parsed.success) {
    return NextResponse.json({ error: "Mes inválido" }, { status: 400 });
  }

  await prisma.pagoArancel.deleteMany({
    where: { studentId: id, tipoArancelId: enrollment.tipoArancelId, month: parsed.data.month },
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "UNMARK_ARANCEL_PAID",
    entity: "PagoArancel",
    detail: `${enrollment.student.lastName}, ${enrollment.student.firstName} -> ${enrollment.tipoArancel.name} (${parsed.data.month})`,
  });

  return NextResponse.json({ ok: true });
}
