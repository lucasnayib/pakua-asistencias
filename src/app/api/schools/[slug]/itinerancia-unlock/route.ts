import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { itineranciaUnlockSchema } from "@/lib/validations";
import { setItineranciaUnlockCookie } from "@/lib/itinerancia-access";
import { isItineranciasOpen, isItineranciasSchool } from "@/lib/itinerancias";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/rate-limit";
import { logChange } from "@/lib/audit";

type Params = { params: Promise<{ slug: string }> };

function lockoutMessage(remainingMs: number): string {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return `Demasiados intentos fallidos. Probá de nuevo en ${minutes} minuto${minutes === 1 ? "" : "s"}.`;
}

/** Desbloqueo público de Itinerancias: código propio, nunca la contraseña real de la escuela. */
export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const rateLimitKey = `itinerancia:${slug}`;

  if (!isItineranciasSchool(slug) || !isItineranciasOpen()) {
    return NextResponse.json({ error: "Itinerancias no está disponible ahora" }, { status: 404 });
  }

  const status = checkRateLimit(rateLimitKey);
  if (status.locked) {
    return NextResponse.json({ error: lockoutMessage(status.remainingMs) }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = itineranciaUnlockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Código obligatorio" }, { status: 400 });
  }

  const admin = await prisma.admin.findFirst({ where: { slug, role: "ADMIN", active: true } });

  if (!admin || !admin.itineranciaAccessCodeHash) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json({ error: "Código incorrecto" }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.code, admin.itineranciaAccessCodeHash);
  if (!valid) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json({ error: "Código incorrecto" }, { status: 401 });
  }

  resetRateLimit(rateLimitKey);
  await setItineranciaUnlockCookie({ adminId: admin.id, slug });
  await logChange({
    actor: "alumno/orientador",
    action: "ITINERANCIA_UNLOCK",
    entity: "Admin",
    entityId: admin.id,
    adminId: admin.id,
  });

  return NextResponse.json({ ok: true });
}
