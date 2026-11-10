import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";

// Bandeja de solicitudes de los admins de escuela hacia el superadmin. Pensada como genérica
// a futuro (de ahí el nombre "solicitudes" y no "borrados"), aunque hoy el único `type` que
// existe es ELIMINAR_MOVIMIENTO — ver AdminRequest en el schema.
export async function GET() {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const solicitudes = await prisma.adminRequest.findMany({
    include: { admin: { select: { displayName: true, username: true, slug: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ solicitudes });
}
