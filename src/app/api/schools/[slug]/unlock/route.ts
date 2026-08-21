import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { schoolUnlockSchema } from "@/lib/validations";
import { setSchoolUnlockCookie } from "@/lib/school-access";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/rate-limit";
import { logChange } from "@/lib/audit";

type Params = { params: Promise<{ slug: string }> };

function lockoutMessage(remainingMs: number): string {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return `Demasiados intentos fallidos. Probá de nuevo en ${minutes} minuto${minutes === 1 ? "" : "s"}.`;
}

export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params;

  const status = checkRateLimit(slug);
  if (status.locked) {
    return NextResponse.json({ error: lockoutMessage(status.remainingMs) }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schoolUnlockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Contraseña obligatoria" }, { status: 400 });
  }

  const admin = await prisma.admin.findFirst({
    where: { slug, role: "ADMIN", active: true },
  });

  // Mismo mensaje genérico tanto si la escuela no existe como si la contraseña es incorrecta,
  // para no filtrar si un slug existe. El rate-limit igual corre por slug en ambos casos.
  //
  // El intento que hace alcanzar el límite (el 5to) todavía se responde como 401 normal:
  // recién el intento siguiente encuentra el bloqueo ya activo (checkRateLimit al inicio) y
  // recibe 429. Esto es intencional: el bloqueo protege contra fuerza bruta, no busca ocultar
  // el resultado del intento que lo activó.
  if (!admin) {
    recordFailedAttempt(slug);
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.password, admin.passwordHash);
  if (!valid) {
    recordFailedAttempt(slug);
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  resetRateLimit(slug);
  await setSchoolUnlockCookie({ adminId: admin.id, slug });
  await logChange({
    actor: admin.displayName || admin.username,
    action: "SCHOOL_UNLOCK",
    entity: "Admin",
    entityId: admin.id,
    adminId: admin.id,
  });

  return NextResponse.json({ ok: true });
}
