import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, verifyTwoFactorPendingToken } from "@/lib/auth";
import { twoFactorVerifySchema } from "@/lib/validations";
import { logChange } from "@/lib/audit";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/rate-limit";
import { consumeBackupCode, verifyTotpToken } from "@/lib/two-factor";

function lockoutMessage(remainingMs: number): string {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return `Demasiados intentos fallidos. Probá de nuevo en ${minutes} minuto${minutes === 1 ? "" : "s"}.`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = twoFactorVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { tempToken, code } = parsed.data;

  const pending = await verifyTwoFactorPendingToken(tempToken);
  if (!pending) {
    return NextResponse.json({ error: "La verificación expiró, iniciá sesión de nuevo" }, { status: 401 });
  }

  const rateLimitKey = `2fa:${pending.adminId}`;
  const status = checkRateLimit(rateLimitKey);
  if (status.locked) {
    return NextResponse.json({ error: lockoutMessage(status.remainingMs) }, { status: 429 });
  }

  const admin = await prisma.admin.findUnique({ where: { id: pending.adminId } });
  if (!admin || admin.role !== "SUPER_ADMIN" || !admin.twoFactorEnabled || !admin.twoFactorSecret) {
    return NextResponse.json({ error: "No se pudo verificar el código" }, { status: 401 });
  }

  let valid = false;
  if (/^\d{6}$/.test(code)) {
    valid = await verifyTotpToken(code, admin.twoFactorSecret);
  } else {
    const result = await consumeBackupCode(code, admin.twoFactorBackupCodes);
    valid = result.valid;
    if (result.valid) {
      await prisma.admin.update({
        where: { id: admin.id },
        data: { twoFactorBackupCodes: result.remainingHashesJson },
      });
    }
  }

  if (!valid) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json({ error: "Código incorrecto" }, { status: 401 });
  }

  resetRateLimit(rateLimitKey);
  const role = "SUPER_ADMIN" as const;
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
