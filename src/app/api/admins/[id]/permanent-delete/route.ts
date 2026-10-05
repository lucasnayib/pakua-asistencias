import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";
import { deleteStudentPhoto, deleteOrientadorPhoto } from "@/lib/upload";

type Params = { params: Promise<{ id: string }> };

// Borrado permanente e irreversible de una escuela: pensado para cuando la escuela pide la
// baja (Sección 7 de los Términos y Condiciones, por mail) y ya tiene actividad, a diferencia
// del DELETE en ../route.ts que solo funciona con cuentas vacías. No hay forma de que el
// código verifique que la escuela realmente lo pidió — es un proceso de confianza del
// super-admin, igual que hoy el pedido llega por mail sin quedar registrado en la app.
export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const existing = await prisma.admin.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  }

  if (existing.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "No se puede eliminar la cuenta de super-admin" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const confirmUsername = typeof body?.confirmUsername === "string" ? body.confirmUsername : "";
  // Re-validado en el servidor, no solo en la UI: evita un borrado accidental por una llamada
  // directa a la API sin pasar por el diálogo de confirmación.
  if (confirmUsername !== existing.username) {
    return NextResponse.json({ error: "El nombre de usuario no coincide" }, { status: 400 });
  }

  const [students, orientadores, counts] = await Promise.all([
    prisma.student.findMany({ where: { adminId: id }, select: { photoUrl: true } }),
    prisma.orientador.findMany({ where: { adminId: id }, select: { photoUrl: true } }),
    Promise.all([
      prisma.student.count({ where: { adminId: id } }),
      prisma.schedule.count({ where: { adminId: id } }),
      prisma.orientador.count({ where: { adminId: id } }),
      prisma.itineranciaActivity.count({ where: { adminId: id } }),
      prisma.exportLog.count({ where: { adminId: id } }),
    ]),
  ]);
  const [studentCount, scheduleCount, orientadorCount, itineranciaCount, exportLogCount] = counts;

  // El orden no es estrictamente necesario (cada tabla se filtra por adminId, no depende de
  // que la anterior ya se haya borrado), pero sigue el mismo sentido de dependencia que los
  // cascades ya existentes (Student → graduaciones/migraciones/asistencias/etc.).
  await prisma.$transaction([
    prisma.student.deleteMany({ where: { adminId: id } }),
    prisma.schedule.deleteMany({ where: { adminId: id } }),
    prisma.orientador.deleteMany({ where: { adminId: id } }),
    prisma.itineranciaActivity.deleteMany({ where: { adminId: id } }),
    prisma.exportLog.deleteMany({ where: { adminId: id } }),
    prisma.admin.delete({ where: { id } }),
  ]);

  // Los archivos en disco no participan de la transacción de la base — se limpian después,
  // a mejor esfuerzo (igual criterio que deleteStudentPhoto/deleteOrientadorPhoto, que no
  // lanzan si el archivo ya no existe).
  await Promise.all([
    ...students.map((s) => deleteStudentPhoto(s.photoUrl)),
    ...orientadores.map((o) => deleteOrientadorPhoto(o.photoUrl)),
  ]);

  // El AuditLog de esta escuela (adminId suelto, no es una relación real) se deja tal cual:
  // es el único rastro que queda de que la cuenta existió y de este mismo borrado.
  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "PERMANENTLY_DELETE_ADMIN",
    entity: "Admin",
    entityId: id,
    detail: `${existing.displayName} (@${existing.username}) — ${studentCount} alumnos, ${scheduleCount} horarios, ${orientadorCount} orientadores, ${itineranciaCount} actividades, ${exportLogCount} exportaciones eliminados permanentemente`,
  });

  return NextResponse.json({ ok: true });
}
