import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { requestPasswordChangeSchema } from "@/lib/validations";
import { checkRateLimit, recordFailedAttempt } from "@/lib/rate-limit";
import { generateVerificationCode, hashVerificationCode, VERIFICATION_CODE_DURATION_MINUTES } from "@/lib/verification-code";
import { sendPasswordChangeCode } from "@/lib/email";

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = requestPasswordChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const admin = await prisma.admin.findUnique({ where: { id: session.adminId } });
  if (!admin?.contactEmail) {
    return NextResponse.json(
      { error: "Necesitás tener un mail de contacto confirmado antes de poder cambiar la contraseña" },
      { status: 400 }
    );
  }

  const rateLimitKey = `password-request:${session.adminId}`;
  const status = checkRateLimit(rateLimitKey);
  if (status.locked) {
    return NextResponse.json({ error: "Demasiados pedidos. Probá de nuevo más tarde." }, { status: 429 });
  }
  recordFailedAttempt(rateLimitKey);

  const { newPassword } = parsed.data;
  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  const code = generateVerificationCode();
  const codeHash = await hashVerificationCode(code);

  await prisma.admin.update({
    where: { id: session.adminId },
    data: {
      pendingChangeType: "PASSWORD",
      pendingChangeValue: newPasswordHash,
      pendingChangeCodeHash: codeHash,
      pendingChangeExpiresAt: new Date(Date.now() + VERIFICATION_CODE_DURATION_MINUTES * 60_000),
    },
  });

  // sendPasswordChangeCode nunca lanza (mismo patrón resiliente de src/lib/email.ts).
  await sendPasswordChangeCode({ contactEmail: admin.contactEmail, displayName: session.displayName, code });

  return NextResponse.json({ ok: true });
}
