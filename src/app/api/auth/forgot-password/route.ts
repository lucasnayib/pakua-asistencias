import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/auth";
import { forgotPasswordSchema } from "@/lib/validations";
import { checkRateLimit, recordFailedAttempt } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";

const GENERIC_MESSAGE =
  "Si el usuario existe y tiene un mail de contacto registrado, te va a llegar un mail con instrucciones.";

function lockoutMessage(remainingMs: number): string {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return `Demasiados intentos. Probá de nuevo en ${minutes} minuto${minutes === 1 ? "" : "s"}.`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ingresá tu usuario" }, { status: 400 });
  }

  const { username } = parsed.data;
  const rateLimitKey = `forgot-password:${username.toLowerCase()}`;
  const status = checkRateLimit(rateLimitKey);
  if (status.locked) {
    return NextResponse.json({ error: lockoutMessage(status.remainingMs) }, { status: 429 });
  }
  // Cuenta como "intento" independientemente del resultado, para limitar cuántos mails
  // se pueden disparar por usuario en una ventana de tiempo.
  recordFailedAttempt(rateLimitKey);

  const admin = await prisma.admin.findUnique({ where: { username } });

  // Respuesta genérica siempre, exista o no la cuenta — para no habilitar enumeración de
  // usuarios desde este formulario público. Solo se manda el mail de verdad si además es
  // una cuenta ADMIN (no super-admin), activa, y tiene un mail de contacto registrado.
  if (admin && admin.role === "ADMIN" && admin.active && admin.contactEmail) {
    const token = await createPasswordResetToken(admin.id, admin.passwordHash);
    try {
      await sendPasswordResetEmail({
        contactEmail: admin.contactEmail,
        displayName: admin.displayName || admin.username,
        token,
      });
    } catch (error) {
      console.error("No se pudo enviar el mail de reseteo de contraseña:", error);
    }
  }

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}
