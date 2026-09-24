import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { requireItineranciaAdminAccess } from "@/lib/itinerancias";
import { buildStudentsExcelBuffer } from "@/lib/export/students-excel";
import { buildItineranciaPlanillaPdfBuffer } from "@/lib/export/itinerancia-planilla-pdf";
import { logChange } from "@/lib/audit";
import { slugify } from "@/lib/slug";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
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

  const registrations = activity.studentRegistrations;

  function toExportRow(r: (typeof registrations)[number]) {
    const orientador = r.student.orientadores[0]?.orientador;
    return {
      firstName: r.student.firstName,
      lastName: r.student.lastName,
      formacion: r.student.formacion,
      graduacion: r.student.graduacion,
      evaluationDate: r.student.evaluationDate,
      dni: r.student.dni,
      birthDate: r.student.birthDate,
      orientadorName: orientador ? `${orientador.lastName}, ${orientador.firstName}` : null,
      active: r.student.active,
    };
  }

  const format = request.nextUrl.searchParams.get("format");
  const isPlanilla = format === "planilla";

  // El Excel sigue listando a todos los inscriptos (sirve como control de quién se anotó); la
  // planilla evaluatoria en PDF, en cambio, es la que se usa en el evento para evaluar — solo
  // tiene sentido con los alumnos que efectivamente se presentaron (marcaron asistencia).
  const rows = isPlanilla
    ? registrations.filter((r) => r.attendedAt !== null).map(toExportRow)
    : registrations.map(toExportRow);

  // Esta exportación es el roster de inscriptos a UNA actividad puntual, no el listado de
  // alumnos de la escuela — el historial de graduaciones no aplica acá, por eso va vacío.
  const buffer = isPlanilla
    ? await buildItineranciaPlanillaPdfBuffer(rows, activity.date)
    : await buildStudentsExcelBuffer(rows, []);
  const filename = isPlanilla
    ? `planilla_${slugify(activity.title)}.pdf`
    : `itinerancia_${slugify(activity.title)}.xlsx`;

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "EXPORT_ITINERANCIA_REGISTRATIONS",
    entity: "ItineranciaActivity",
    entityId: activity.id,
    detail: `${activity.title} (${rows.length} ${isPlanilla ? "presentes" : "inscriptos"})`,
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": isPlanilla
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
