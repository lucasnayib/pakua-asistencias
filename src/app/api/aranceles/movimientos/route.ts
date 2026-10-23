import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";
import { movimientoFinancieroCreateSchema } from "@/lib/validations";
import { getMovimientosList } from "@/lib/aranceles-server";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const month = request.nextUrl.searchParams.get("month");
  const tipo = request.nextUrl.searchParams.get("tipo");

  const movimientos = await getMovimientosList(session.adminId, { month, tipo });

  return NextResponse.json({ movimientos });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = movimientoFinancieroCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const movimiento = await prisma.movimientoFinanciero.create({
    data: { ...parsed.data, adminId: session.adminId },
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "CREATE_MOVIMIENTO_FINANCIERO",
    entity: "MovimientoFinanciero",
    entityId: movimiento.id,
    detail: `${movimiento.tipo} ${movimiento.concepto} ($${movimiento.amount})`,
  });

  return NextResponse.json({ movimiento }, { status: 201 });
}
