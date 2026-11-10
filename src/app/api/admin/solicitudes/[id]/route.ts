import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";
import { resolverSolicitudSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

// Aprobar o rechazar una solicitud (ver GET /api/admin/solicitudes). Aprobar ELIMINAR_MOVIMIENTO
// borra en el momento el PagoArancel/MovimientoFinanciero referenciado — el admin de la escuela
// no tiene que volver a hacer nada.
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const solicitud = await prisma.adminRequest.findUnique({ where: { id } });
  if (!solicitud) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  if (solicitud.status !== "PENDIENTE") {
    return NextResponse.json({ error: "Esta solicitud ya fue resuelta" }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const parsed = resolverSolicitudSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { action, note } = parsed.data;

  if (action === "APROBAR" && solicitud.type === "ELIMINAR_MOVIMIENTO" && solicitud.targetId) {
    if (solicitud.targetType === "PAGO") {
      const pagoId = solicitud.targetId.slice("pago:".length);
      await prisma.pagoArancel.deleteMany({ where: { id: pagoId } });
    } else if (solicitud.targetType === "MOVIMIENTO") {
      await prisma.movimientoFinanciero.deleteMany({ where: { id: solicitud.targetId } });
    }
  }

  const resolved = await prisma.adminRequest.update({
    where: { id },
    data: {
      status: action === "APROBAR" ? "APROBADA" : "RECHAZADA",
      resolutionNote: note,
      resolvedAt: new Date(),
    },
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: action === "APROBAR" ? "APPROVE_ADMIN_REQUEST" : "REJECT_ADMIN_REQUEST",
    entity: "AdminRequest",
    entityId: id,
    detail: `${solicitud.targetLabel ?? solicitud.type}${note ? ` — "${note}"` : ""}`,
  });

  return NextResponse.json({ solicitud: resolved });
}
