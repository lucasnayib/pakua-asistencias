import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildOrientadorStudentsExcelBuffer } from "@/lib/export/orientador-excel";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";
import { slugify } from "@/lib/slug";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  const orientador = await prisma.orientador.findUnique({
    where: { id, adminId: session.adminId },
    include: {
      students: {
        include: { student: true },
        orderBy: { student: { lastName: "asc" } },
      },
    },
  });
  if (!orientador) {
    return NextResponse.json({ error: "Orientador no encontrado" }, { status: 404 });
  }

  const rows = orientador.students.map((link) => ({
    firstName: link.student.firstName,
    lastName: link.student.lastName,
    active: link.student.active,
  }));

  const buffer = await buildOrientadorStudentsExcelBuffer(rows);
  const filename = `alumnos_${slugify(`${orientador.firstName}_${orientador.lastName}`)}.xlsx`;

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "EXPORT_ORIENTADOR_STUDENTS",
    entity: "Orientador",
    entityId: orientador.id,
    detail: `${orientador.firstName} ${orientador.lastName} (${rows.length} alumnos)`,
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
