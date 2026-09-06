import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { buildStudentsExcelBuffer } from "@/lib/export/students-excel";
import { logChange } from "@/lib/audit";

export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const students = await prisma.student.findMany({
    where: { adminId: session.adminId },
    include: {
      orientadores: {
        include: { orientador: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const rows = students.map((s) => {
    const orientador = s.orientadores[0]?.orientador;
    return {
      ...s,
      orientadorName: orientador ? `${orientador.lastName}, ${orientador.firstName}` : null,
    };
  });

  const buffer = await buildStudentsExcelBuffer(rows);
  const filename = `alumnos_${new Date().toISOString().slice(0, 10)}.xlsx`;

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "EXPORT_STUDENTS",
    entity: "Student",
    detail: `${filename} (${students.length} alumnos)`,
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
