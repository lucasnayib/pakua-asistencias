import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";

type Params = { params: Promise<{ id: string; alumnoArancelId: string }> };

export async function PATCH(_request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id, alumnoArancelId } = await params;
  const existing = await prisma.alumnoArancel.findUnique({
    where: { id: alumnoArancelId },
    include: { student: true, tipoArancel: true },
  });
  if (!existing || existing.studentId !== id || existing.student.adminId !== session.adminId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // Desanotar: se conserva la fila y el historial de pagos, solo se marca inactivo (ver
  // src/lib/aranceles-calc.ts — deja de pedírsele ese arancel en meses futuros).
  const updated = await prisma.alumnoArancel.update({
    where: { id: alumnoArancelId },
    data: { active: false },
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "UNENROLL_ALUMNO_ARANCEL",
    entity: "AlumnoArancel",
    entityId: updated.id,
    detail: `${existing.student.lastName}, ${existing.student.firstName} -> ${existing.tipoArancel.name}`,
  });

  return NextResponse.json({ enrollment: updated });
}
