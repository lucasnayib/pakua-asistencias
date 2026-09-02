import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { confirmPendingChangeSchema } from "@/lib/validations";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/rate-limit";
import { verifyVerificationCode } from "@/lib/verification-code";
import { logChange } from "@/lib/audit";

const INVALID_MESSAGE = "El código no es válido o ya venció. Pedí uno nuevo.";

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = confirmPendingChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Código inválido" }, { status: 400 });
  }

  const rateLimitKey = `contact-email-confirm:${session.adminId}`;
  const status = checkRateLimit(rateLimitKey);
  if (status.locked) {
    return NextResponse.json({ error: "Demasiados intentos. Pedí un código nuevo." }, { status: 429 });
  }

  const admin = await prisma.admin.findUnique({ where: { id: session.adminId } });
  if (
    !admin ||
    admin.pendingChangeType !== "EMAIL" ||
    !admin.pendingChangeValue ||
    !admin.pendingChangeCodeHash ||
    !admin.pendingChangeExpiresAt ||
    admin.pendingChangeExpiresAt < new Date()
  ) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
  }

  const valid = await verifyVerificationCode(parsed.data.code, admin.pendingChangeCodeHash);
  if (!valid) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
  }

  await prisma.admin.update({
    where: { id: session.adminId },
    data: {
      contactEmail: admin.pendingChangeValue,
      pendingChangeType: null,
      pendingChangeValue: null,
      pendingChangeCodeHash: null,
      pendingChangeExpiresAt: null,
    },
  });

  resetRateLimit(rateLimitKey);
  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "CHANGE_CONTACT_EMAIL",
    entity: "Admin",
    entityId: session.adminId,
  });

  return NextResponse.json({ ok: true, contactEmail: admin.pendingChangeValue });
}
