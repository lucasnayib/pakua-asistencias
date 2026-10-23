import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";
import { tipoArancelUpdateSchema } from "@/lib/validations";
import { autoEnrollStudentsForTipo } from "@/lib/aranceles-server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const existing = await prisma.tipoArancel.findUnique({ where: { id, adminId: session.adminId } });
  if (!existing) {
    return NextResponse.json({ error: "Tipo de arancel no encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = tipoArancelUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const tipo = await prisma.tipoArancel.update({
    where: { id, adminId: session.adminId },
    data: parsed.data,
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "UPDATE_TIPO_ARANCEL",
    entity: "TipoArancel",
    entityId: tipo.id,
    detail: `${tipo.name} ($${tipo.amount})`,
  });

  // Cubre renombrar a un nombre que ahora coincide con una formación, o reactivar un tipo
  // desactivado: en ambos casos puede haber alumnos esperando este arancel.
  if (tipo.active) {
    await autoEnrollStudentsForTipo(session.adminId, tipo.id, tipo.name);
  }

  return NextResponse.json({ tipo });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const existing = await prisma.tipoArancel.findUnique({ where: { id, adminId: session.adminId } });
  if (!existing) {
    return NextResponse.json({ error: "Tipo de arancel no encontrado" }, { status: 404 });
  }

  // Borrado real, a pedido explícito: se lleva puesto también las inscripciones y el
  // historial de pagos de esta actividad (los recibos ya generados no dependen de esto, pero
  // dejan de verse en la lista de movimientos). Distinto del resto de la app (alumnos/
  // orientadores se dan de baja, no se borran) porque acá lo pidieron así a propósito.
  await prisma.$transaction([
    prisma.pagoArancel.deleteMany({ where: { tipoArancelId: id } }),
    prisma.alumnoArancel.deleteMany({ where: { tipoArancelId: id } }),
    prisma.tipoArancel.delete({ where: { id, adminId: session.adminId } }),
  ]);

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "DELETE_TIPO_ARANCEL",
    entity: "TipoArancel",
    entityId: id,
    detail: existing.name,
  });

  return NextResponse.json({ ok: true });
}
