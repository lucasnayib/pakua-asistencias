import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { studentMigrationCodeSchema } from "@/lib/validations";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/rate-limit";
import { findLiveMigrationByCode } from "@/lib/student-migration";
import { copyStudentPhoto } from "@/lib/upload";
import { isSubscriptionSuspended } from "@/lib/subscription";
import { logChange } from "@/lib/audit";

const INVALID_MESSAGE = "El código no es válido o ya venció.";

const studentInclude = {
  orientadores: { include: { orientador: true }, orderBy: { createdAt: "asc" as const }, take: 1 },
  graduationHistory: { orderBy: [{ authorizedAt: "desc" as const }, { createdAt: "desc" as const }] },
};

/** Se lanza dentro del $transaction para abortarlo cuando el CAS de abajo pierde la carrera
 * (otra request ya reclamó/canceló este mismo código entre el findFirst y acá). */
class MigrationAlreadyClaimedError extends Error {}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = studentMigrationCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  // Misma clave que /api/students/migrate/lookup — ver comentario ahí.
  const rateLimitKey = `student-migration:${session.adminId}`;
  const status = checkRateLimit(rateLimitKey);
  if (status.locked) {
    return NextResponse.json({ error: "Demasiados intentos. Probá de nuevo más tarde." }, { status: 429 });
  }

  // Nunca confiar en un preview anterior de /lookup: se vuelve a resolver todo de cero acá.
  const migration = await findLiveMigrationByCode(parsed.data.code);
  if (!migration) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
  }

  const { student: originStudent } = migration;

  if (originStudent.adminId === session.adminId) {
    return NextResponse.json({ error: "No podés reclamar un alumno de tu propia escuela." }, { status: 400 });
  }
  if (!originStudent.active) {
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
  }
  // Protege a una escuela de origen que se suspendió después de liberar el código (hasta 7
  // días de ventana): no dejar que un tercero le mueva datos mientras no puede ni ver su panel.
  if (isSubscriptionSuspended(originStudent.admin.subscriptionStatus)) {
    return NextResponse.json({ error: "La escuela de origen tiene la suscripción suspendida." }, { status: 409 });
  }

  const destinationAdmin = await prisma.admin.findUnique({
    where: { id: session.adminId },
    select: { subscriptionStatus: true, displayName: true },
  });
  if (destinationAdmin && isSubscriptionSuspended(destinationAdmin.subscriptionStatus)) {
    return NextResponse.json({ error: "Tu escuela tiene la suscripción suspendida." }, { status: 403 });
  }

  // Operación de archivo, fuera de la transacción de base de datos.
  const photoUrl = await copyStudentPhoto(originStudent.photoUrl);

  let newStudent;
  try {
    newStudent = await prisma.$transaction(async (tx) => {
      // CAS: si esto afecta 0 filas, alguien más ya reclamó/canceló este código entre el
      // findLiveMigrationByCode de arriba y acá — aborta todo, nada de lo de abajo se aplica.
      const claimed = await tx.studentMigration.updateMany({
        where: { id: migration.id, status: "PENDING" },
        data: { status: "COMPLETED" },
      });
      if (claimed.count === 0) {
        throw new MigrationAlreadyClaimedError();
      }

      const created = await tx.student.create({
        data: {
          adminId: session.adminId,
          firstName: originStudent.firstName,
          lastName: originStudent.lastName,
          photoUrl,
          formacion: originStudent.formacion,
          graduacion: originStudent.graduacion,
          evaluationDate: originStudent.evaluationDate,
          graduacionDelivered: originStudent.graduacionDelivered,
          graduacionDeliveredAt: originStudent.graduacionDeliveredAt,
          dni: originStudent.dni,
          birthDate: originStudent.birthDate,
          active: true,
        },
      });

      if (originStudent.graduationHistory.length > 0) {
        await tx.studentGraduationHistory.createMany({
          data: originStudent.graduationHistory.map((h) => ({
            studentId: created.id,
            graduacion: h.graduacion,
            authorizedAt: h.authorizedAt,
            delivered: h.delivered,
            deliveredAt: h.deliveredAt,
          })),
        });
      }

      await tx.student.update({
        where: { id: originStudent.id },
        data: { active: false },
      });

      await tx.studentMigration.update({
        where: { id: migration.id },
        data: { destinationAdminId: session.adminId, newStudentId: created.id, completedAt: new Date() },
      });

      // Se vuelve a leer con el include recién acá: el `create` de arriba capturó el alumno
      // ANTES de insertar las filas de graduationHistory, así que su propio include hubiera
      // devuelto un historial vacío.
      return tx.student.findUniqueOrThrow({ where: { id: created.id }, include: studentInclude });
    });
  } catch (error) {
    if (error instanceof MigrationAlreadyClaimedError) {
      return NextResponse.json({ error: INVALID_MESSAGE }, { status: 409 });
    }
    throw error;
  }

  resetRateLimit(rateLimitKey);

  // Primera vez en esta app donde actor y adminId del log no son la misma persona: quien
  // actuó fue la escuela destino, sobre datos que le pertenecen a la escuela de origen.
  await logChange({
    actor: session.displayName,
    adminId: originStudent.adminId,
    action: "STUDENT_MIGRATED",
    entity: "Student",
    entityId: originStudent.id,
    detail: `${originStudent.firstName} ${originStudent.lastName} migrado a ${session.displayName}`,
  });
  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "STUDENT_MIGRATED",
    entity: "Student",
    entityId: newStudent.id,
    detail: `${originStudent.firstName} ${originStudent.lastName} migrado desde ${originStudent.admin.displayName}`,
  });

  const { orientadores, graduationHistory, ...rest } = newStudent;
  return NextResponse.json({
    student: {
      ...rest,
      orientador: orientadores[0]?.orientador ?? null,
      graduationHistory: graduationHistory.map((h) => ({
        id: h.id,
        graduacion: h.graduacion,
        authorizedAt: h.authorizedAt,
        delivered: h.delivered,
        deliveredAt: h.deliveredAt,
        createdAt: h.createdAt,
      })),
    },
  });
}
