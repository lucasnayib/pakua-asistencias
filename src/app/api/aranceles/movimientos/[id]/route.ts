import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";
import { movimientoFinancieroUpdateSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const existing = await prisma.movimientoFinanciero.findUnique({ where: { id, adminId: session.adminId } });
  if (!existing) {
    return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = movimientoFinancieroUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const movimiento = await prisma.movimientoFinanciero.update({
    where: { id, adminId: session.adminId },
    data: parsed.data,
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "UPDATE_MOVIMIENTO_FINANCIERO",
    entity: "MovimientoFinanciero",
    entityId: movimiento.id,
    detail: `${movimiento.tipo} ${movimiento.concepto} ($${movimiento.amount})`,
  });

  return NextResponse.json({ movimiento });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const existing = await prisma.movimientoFinanciero.findUnique({ where: { id, adminId: session.adminId } });
  if (!existing) {
    return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 });
  }

  await prisma.movimientoFinanciero.delete({ where: { id, adminId: session.adminId } });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "DELETE_MOVIMIENTO_FINANCIERO",
    entity: "MovimientoFinanciero",
    entityId: id,
    detail: `${existing.tipo} ${existing.concepto} ($${existing.amount})`,
  });

  return NextResponse.json({ ok: true });
}
