import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { requireItineranciaAdminAccess } from "@/lib/itinerancias";
import { buildStudentsExcelBuffer } from "@/lib/export/students-excel";
import { logChange } from "@/lib/audit";
import { slugify } from "@/lib/slug";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const denied = await requireItineranciaAdminAccess(session.adminId);
  if (denied) return denied;

  const { id } = await params;
  const activity = await prisma.itineranciaActivity.findUnique({
    where: { id, adminId: session.adminId },
    include: {
      studentRegistrations: {
        include: {
          student: {
            include: {
              orientadores: { include: { orientador: true }, orderBy: { createdAt: "asc" }, take: 1 },
            },
          },
        },
        orderBy: { student: { lastName: "asc" } },
      },
    },
  });
  if (!activity) {
    return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
  }

  const rows = activity.studentRegistrations.map((r) => {
    const orientador = r.student.orientadores[0]?.orientador;
    return {
      firstName: r.student.firstName,
      lastName: r.student.lastName,
      formacion: r.student.formacion,
      graduacion: r.student.graduacion,
      evaluationDate: r.student.evaluationDate,
      dni: r.student.dni,
      orientadorName: orientador ? `${orientador.lastName}, ${orientador.firstName}` : null,
      active: r.student.active,
    };
  });

  const buffer = await buildStudentsExcelBuffer(rows);
  const filename = `itinerancia_${slugify(activity.title)}.xlsx`;

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "EXPORT_ITINERANCIA_REGISTRATIONS",
    entity: "ItineranciaActivity",
    entityId: activity.id,
    detail: `${activity.title} (${rows.length} inscriptos)`,
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
