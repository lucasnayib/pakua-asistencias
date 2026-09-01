import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createTwoFactorPendingToken, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { logChange } from "@/lib/audit";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/rate-limit";

function lockoutMessage(remainingMs: number): string {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return `Demasiados intentos fallidos. Probá de nuevo en ${minutes} minuto${minutes === 1 ? "" : "s"}.`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Usuario y contraseña son obligatorios" }, { status: 400 });
  }

  const { username, password } = parsed.data;
  const rateLimitKey = `login:${username.toLowerCase()}`;

  const status = checkRateLimit(rateLimitKey);
  if (status.locked) {
    return NextResponse.json({ error: lockoutMessage(status.remainingMs) }, { status: 429 });
  }

  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  if (!admin.active) {
    return NextResponse.json({ error: "Esta cuenta está desactivada" }, { status: 401 });
  }

  if (!admin.approved) {
    return NextResponse.json({ error: "Tu cuenta todavía está pendiente de aprobación" }, { status: 401 });
  }

  resetRateLimit(rateLimitKey);
  const role = admin.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";

  // El 2FA solo aplica al super-admin. Si lo tiene activo, todavía no se crea la sesión:
  // se devuelve un token intermedio que solo sirve para pasar por /api/auth/verify-2fa.
  if (role === "SUPER_ADMIN" && admin.twoFactorEnabled) {
    const tempToken = await createTwoFactorPendingToken(admin.id);
    return NextResponse.json({ requiresTwoFactor: true, tempToken });
  }

  await setSessionCookie({
    adminId: admin.id,
    username: admin.username,
    displayName: admin.displayName || admin.username,
    role,
  });
  await logChange({
    actor: admin.displayName || admin.username,
    action: "LOGIN",
    entity: "Admin",
    entityId: admin.id,
    adminId: admin.id,
  });

  return NextResponse.json({ ok: true, username: admin.username, role });
}
