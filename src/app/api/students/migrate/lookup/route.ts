import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { studentMigrationCodeSchema } from "@/lib/validations";
import { checkRateLimit, recordFailedAttempt } from "@/lib/rate-limit";
import { findLiveMigrationByCode } from "@/lib/student-migration";

const INVALID_MESSAGE = "El código no es válido o ya venció.";

/** Lado DESTINO: vista previa de solo lectura antes de confirmar el claim. No muta nada. */
export async function POST(request: Request) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = studentMigrationCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  // Misma clave que /api/students/migrate/claim: es el mismo código de 6 dígitos, así que
  // comparten un solo presupuesto de intentos (si no, alcanzaría con repartir los intentos
  // entre las dos rutas para duplicar el margen de fuerza bruta).
  const rateLimitKey = `student-migration:${session.adminId}`;
  const status = checkRateLimit(rateLimitKey);
  if (status.locked) {
    return NextResponse.json({ error: "Demasiados intentos. Probá de nuevo más tarde." }, { status: 429 });
  }

  const migration = await findLiveMigrationByCode(parsed.data.code);
  if (!migration) {
    recordFailedAttempt(rateLimitKey);
    // Mensaje genérico: no confirma ni niega si el código existió/venció/ya se usó.
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
  }

  const { student } = migration;
  return NextResponse.json({
    firstName: student.firstName,
    lastName: student.lastName,
    photoUrl: student.photoUrl,
    formacion: student.formacion,
    graduacion: student.graduacion,
    evaluationDate: student.evaluationDate,
    graduacionDelivered: student.graduacionDelivered,
    graduacionDeliveredAt: student.graduacionDeliveredAt,
    dni: student.dni,
    birthDate: student.birthDate,
    graduationHistory: student.graduationHistory.map((h) => ({
      id: h.id,
      graduacion: h.graduacion,
      authorizedAt: h.authorizedAt,
      delivered: h.delivered,
      deliveredAt: h.deliveredAt,
      createdAt: h.createdAt,
    })),
    sourceSchoolName: student.admin.displayName,
  });
}
