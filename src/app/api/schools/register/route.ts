import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { schoolRegistrationSchema } from "@/lib/validations";
import { slugify, uniqueSlug } from "@/lib/slug";
import { checkRateLimit, recordFailedAttempt } from "@/lib/rate-limit";
import { logChange } from "@/lib/audit";
import { isP2002, p2002Fields } from "@/lib/prisma-errors";
import { notifyNewSchoolRequest } from "@/lib/email";

function lockoutMessage(remainingMs: number): string {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return `Demasiadas solicitudes. Probá de nuevo en ${minutes} minuto${minutes === 1 ? "" : "s"}.`;
}

/**
 * Extrae una IP "mejor esfuerzo" del pedido para usarla como key del rate-limit. En producción
 * (detrás de un proxy) `x-forwarded-for` trae la IP real del cliente como primer valor de la
 * lista; en desarrollo local (sin proxy) esa cabecera no está presente, así que se usa un
 * fallback fijo — total, un único desarrollador pegándole al endpoint local no necesita
 * distinguirse por IP.
 */
function getRequestIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "local";
}

export async function POST(request: NextRequest) {
  const ip = getRequestIp(request);
  const rateLimitKey = `school-register:${ip}`;

  const status = checkRateLimit(rateLimitKey);
  if (status.locked) {
    return NextResponse.json({ error: lockoutMessage(status.remainingMs) }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schoolRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const { username, password, displayName, contactEmail, contactPhone } = parsed.data;

  const existingSlugs = (await prisma.admin.findMany({ select: { slug: true } })).map((a) => a.slug);
  const slug = uniqueSlug(slugify(displayName), existingSlugs);
  const passwordHash = await bcrypt.hash(password, 10);

  let admin;
  try {
    admin = await prisma.admin.create({
      data: {
        username,
        passwordHash,
        displayName,
        slug,
        role: "ADMIN",
        active: true,
        approved: false,
        contactEmail,
        contactPhone,
      },
      select: { id: true },
    });
  } catch (error) {
    recordFailedAttempt(rateLimitKey);
    if (isP2002(error) && p2002Fields(error).includes("username")) {
      // Mensaje genérico: no confirmamos ni negamos si el usuario ya existía, para no
      // habilitar enumeración de cuentas desde un formulario público.
      return NextResponse.json(
        { error: "No se pudo procesar la solicitud. Revisá los datos e intentá de nuevo." },
        { status: 400 }
      );
    }
    throw error;
  }

  await logChange({
    actor: `${displayName} (solicitud pública)`,
    action: "SCHOOL_REGISTRATION_REQUEST",
    entity: "Admin",
    entityId: admin.id,
    detail: `${displayName} (${username}) — contacto: ${contactEmail} / ${contactPhone}`,
    adminId: admin.id,
  });

  try {
    await notifyNewSchoolRequest({ displayName, username, contactEmail, contactPhone });
  } catch (error) {
    console.error("No se pudo notificar la solicitud nueva por mail:", error);
  }

  return NextResponse.json({
    ok: true,
    message: "Tu solicitud fue recibida. Un administrador la va a revisar antes de habilitar el acceso.",
  });
}
