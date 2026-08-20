import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildOrientadorStudentsExcelBuffer } from "@/lib/export/orientador-excel";
import { getSession } from "@/lib/auth";
import { logChange } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const orientador = await prisma.orientador.findUnique({
    where: { id },
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

  const session = await getSession();
  await logChange({
    actor: session?.username ?? "admin",
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
