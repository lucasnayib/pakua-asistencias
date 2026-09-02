import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { decodePasswordResetToken, passwordResetFingerprintMatches } from "@/lib/auth";
import { resetPasswordSchema } from "@/lib/validations";
import { logChange } from "@/lib/audit";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/rate-limit";

const INVALID_MESSAGE = "El link no es válido o ya venció. Pedí uno nuevo.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const { token, password } = parsed.data;
  const rateLimitKey = `reset-password:${token.slice(0, 24)}`;
  const status = checkRateLimit(rateLimitKey);
  if (status.locked) {
    return NextResponse.json({ error: "Demasiados intentos. Pedí un link nuevo." }, { status: 429 });
  }

  const decoded = await decodePasswordResetToken(token);
  if (!decoded) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
  }

  const admin = await prisma.admin.findUnique({ where: { id: decoded.adminId } });
  if (!admin || admin.role !== "ADMIN" || !admin.active) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
  }

  if (!passwordResetFingerprintMatches(decoded.fp, admin.passwordHash)) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash } });
  resetRateLimit(rateLimitKey);

  await logChange({
    actor: admin.displayName || admin.username,
    adminId: admin.id,
    action: "RESET_PASSWORD",
    entity: "Admin",
    entityId: admin.id,
  });

  return NextResponse.json({ ok: true });
}
