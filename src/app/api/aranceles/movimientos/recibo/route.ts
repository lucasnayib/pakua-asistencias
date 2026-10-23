import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";
import { buildReciboPdf } from "@/lib/export/recibo-pdf";

// Recibo de un ingreso puntual: sirve tanto para una cuota pagada por un alumno (PagoArancel,
// id con el prefijo "pago:" que ya usa el listado de /api/aranceles/movimientos) como para un
// ingreso suelto cargado a mano (MovimientoFinanciero). Solo ingresos — no tiene sentido un
// "recibo" de un gasto.
export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }

  const admin = await prisma.admin.findUnique({ where: { id: session.adminId }, select: { displayName: true } });
  const schoolName = admin?.displayName?.trim() || session.displayName;

  let recibo: { concepto: string; amount: number; date: string; alumno?: string; numero: string };

  if (id.startsWith("pago:")) {
    const pagoId = id.slice("pago:".length);
    const pago = await prisma.pagoArancel.findUnique({
      where: { id: pagoId },
      include: { student: true, tipoArancel: true },
    });
    if (!pago || pago.adminId !== session.adminId) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    recibo = {
      concepto: `Cuota — ${pago.tipoArancel.name}`,
      amount: pago.amount,
      date: pago.paidAt.toISOString().slice(0, 10),
      alumno: `${pago.student.lastName}, ${pago.student.firstName}`,
      numero: pagoId.slice(-8).toUpperCase(),
    };
  } else {
    const movimiento = await prisma.movimientoFinanciero.findUnique({ where: { id, adminId: session.adminId } });
    if (!movimiento || movimiento.tipo !== "INGRESO") {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    recibo = {
      concepto: movimiento.concepto,
      amount: movimiento.amount,
      date: movimiento.date,
      numero: movimiento.id.slice(-8).toUpperCase(),
    };
  }

  const buffer = buildReciboPdf({ schoolName, ...recibo });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "GENERATE_RECIBO",
    entity: id.startsWith("pago:") ? "PagoArancel" : "MovimientoFinanciero",
    detail: `${recibo.concepto}${recibo.alumno ? ` — ${recibo.alumno}` : ""} ($${recibo.amount})`,
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recibo_${recibo.date}_${recibo.numero}.pdf"`,
    },
  });
}
