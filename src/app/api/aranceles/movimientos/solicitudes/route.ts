import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";
import { solicitarBorradoMovimientoSchema } from "@/lib/validations";
import { formatMoney } from "@/lib/aranceles-calc";

// Pide al superadmin que borre un movimiento/pago que ya tiene un recibo exportado (ver
// reciboExportedAt en el schema) — el admin de la escuela no puede borrarlo directo. Usa el
// mismo id con prefijo "pago:" que /api/aranceles/movimientos/recibo.
export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = solicitarBorradoMovimientoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { id, reason } = parsed.data;

  let targetType: "PAGO" | "MOVIMIENTO";
  let targetLabel: string;
  let locked: boolean;

  if (id.startsWith("pago:")) {
    const pagoId = id.slice("pago:".length);
    const pago = await prisma.pagoArancel.findUnique({
      where: { id: pagoId },
      include: { student: true, tipoArancel: true },
    });
    if (!pago || pago.adminId !== session.adminId) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    targetType = "PAGO";
    targetLabel = `Cuota — ${pago.tipoArancel.name}, ${pago.student.lastName} ${pago.student.firstName} (${formatMoney(pago.amount)})`;
    locked = Boolean(pago.reciboExportedAt);
  } else {
    const movimiento = await prisma.movimientoFinanciero.findUnique({ where: { id, adminId: session.adminId } });
    if (!movimiento) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    targetType = "MOVIMIENTO";
    targetLabel = `${movimiento.concepto} (${formatMoney(movimiento.amount)})`;
    locked = Boolean(movimiento.reciboExportedAt);
  }

  if (!locked) {
    return NextResponse.json(
      { error: "Este movimiento no tiene recibo exportado: se puede borrar directamente, sin pedir autorización." },
      { status: 400 }
    );
  }

  const alreadyPending = await prisma.adminRequest.findFirst({
    where: { adminId: session.adminId, type: "ELIMINAR_MOVIMIENTO", targetId: id, status: "PENDIENTE" },
  });
  if (alreadyPending) {
    return NextResponse.json({ error: "Ya hay una solicitud pendiente para este movimiento" }, { status: 409 });
  }

  const solicitud = await prisma.adminRequest.create({
    data: {
      adminId: session.adminId,
      type: "ELIMINAR_MOVIMIENTO",
      targetType,
      targetId: id,
      targetLabel,
      reason,
    },
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "REQUEST_DELETE_MOVIMIENTO",
    entity: "AdminRequest",
    entityId: solicitud.id,
    detail: `${targetLabel} — "${reason}"`,
  });

  return NextResponse.json({ solicitud }, { status: 201 });
}
