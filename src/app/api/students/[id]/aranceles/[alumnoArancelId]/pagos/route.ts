import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";
import { pagoArancelCreateSchema, pagoArancelMonthSchema, pagoArancelUpdatePorcentajeSchema } from "@/lib/validations";

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
  const parsed = pagoArancelCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  // El monto ya no sale de un precio fijo de la actividad: lo escribe el admin acá mismo, cada
  // vez (ver pagoArancelCreateSchema). Si ya existe un pago para ese mes, no se pisa su monto
  // histórico con el nuevo valor recibido.
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
      amount: parsed.data.amount,
      escuelaPorcentaje: parsed.data.escuelaPorcentaje,
      porcentajePagado: parsed.data.porcentajePagado,
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

// Para cargar (o corregir) a posteriori el % de un pago de FEDERACION que ya existía antes de
// que este dato existiera — no toca monto ni mes, solo escuelaPorcentaje.
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id, alumnoArancelId } = await params;
  const enrollment = await loadEnrollment(id, alumnoArancelId, session.adminId);
  if (!enrollment) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = pagoArancelUpdatePorcentajeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const existingPago = await prisma.pagoArancel.findUnique({
    where: {
      studentId_tipoArancelId_month: { studentId: id, tipoArancelId: enrollment.tipoArancelId, month: parsed.data.month },
    },
  });
  if (!existingPago) {
    return NextResponse.json({ error: "No hay un pago para ese mes" }, { status: 404 });
  }

  const pago = await prisma.pagoArancel.update({
    where: { id: existingPago.id },
    data: { escuelaPorcentaje: parsed.data.escuelaPorcentaje },
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "UPDATE_ARANCEL_ESCUELA_PORCENTAJE",
    entity: "PagoArancel",
    entityId: pago.id,
    detail: `${enrollment.student.lastName}, ${enrollment.student.firstName} -> ${enrollment.tipoArancel.name} (${parsed.data.month}): ${parsed.data.escuelaPorcentaje}%`,
  });

  return NextResponse.json({ pago });
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
  const parsed = pagoArancelMonthSchema.safeParse({ month });
  if (!parsed.success) {
    return NextResponse.json({ error: "Mes inválido" }, { status: 400 });
  }

  const existingPago = await prisma.pagoArancel.findUnique({
    where: {
      studentId_tipoArancelId_month: { studentId: id, tipoArancelId: enrollment.tipoArancelId, month: parsed.data.month },
    },
  });

  // Ya se exportó un recibo de esta cuota: no se puede desmarcar directo, hay que pedírselo al
  // superadmin (ver AdminRequest y POST /api/aranceles/movimientos/solicitudes).
  if (existingPago?.reciboExportedAt) {
    return NextResponse.json(
      { error: "Esta cuota ya tiene un recibo exportado y no se puede desmarcar directamente. Pedí su borrado al superadmin." },
      { status: 409 }
    );
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
