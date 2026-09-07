import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { requireItineranciaAdminAccess } from "@/lib/itinerancias";
import { buildItineranciaRegistrationsExcelBuffer } from "@/lib/export/itinerancia-excel";
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
      studentRegistrations: { include: { student: true }, orderBy: { student: { lastName: "asc" } } },
      orientadorRegistrations: { include: { orientador: true }, orderBy: { orientador: { lastName: "asc" } } },
    },
  });
  if (!activity) {
    return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
  }

  const rows = [
    ...activity.studentRegistrations.map((r) => ({
      firstName: r.student.firstName,
      lastName: r.student.lastName,
      type: "Alumno" as const,
    })),
    ...activity.orientadorRegistrations.map((r) => ({
      firstName: r.orientador.firstName,
      lastName: r.orientador.lastName,
      type: "Orientador" as const,
    })),
  ];

  const buffer = await buildItineranciaRegistrationsExcelBuffer(rows);
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
