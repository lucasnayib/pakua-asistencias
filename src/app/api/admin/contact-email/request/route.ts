import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { requestEmailChangeSchema } from "@/lib/validations";
import { checkRateLimit, recordFailedAttempt } from "@/lib/rate-limit";
import { generateVerificationCode, hashVerificationCode, VERIFICATION_CODE_DURATION_MINUTES } from "@/lib/verification-code";
import { sendEmailChangeCode } from "@/lib/email";

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = requestEmailChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const rateLimitKey = `contact-email-request:${session.adminId}`;
  const status = checkRateLimit(rateLimitKey);
  if (status.locked) {
    return NextResponse.json({ error: "Demasiados pedidos. Probá de nuevo más tarde." }, { status: 429 });
  }
  recordFailedAttempt(rateLimitKey);

  const { newEmail } = parsed.data;
  const code = generateVerificationCode();
  const codeHash = await hashVerificationCode(code);

  await prisma.admin.update({
    where: { id: session.adminId },
    data: {
      pendingChangeType: "EMAIL",
      pendingChangeValue: newEmail,
      pendingChangeCodeHash: codeHash,
      pendingChangeExpiresAt: new Date(Date.now() + VERIFICATION_CODE_DURATION_MINUTES * 60_000),
    },
  });

  // sendEmailChangeCode nunca lanza (mismo patrón que el resto de src/lib/email.ts: si el
  // mail no está configurado, se salta en silencio) — no hay nada que atrapar acá.
  await sendEmailChangeCode({ contactEmail: newEmail, displayName: session.displayName, code });

  return NextResponse.json({ ok: true });
}
