import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";
import { twoFactorConfirmSchema } from "@/lib/validations";
import { generateBackupCodes, hashBackupCodes, verifyTotpToken } from "@/lib/two-factor";
import { logChange } from "@/lib/audit";

/**
 * Confirma la activación de 2FA: valida que el código ingresado coincide con el secreto
 * generado en /setup, y recién ahí lo marca como activo y genera los códigos de respaldo
 * (que se muestran una única vez en la respuesta, en texto plano).
 */
export async function POST(request: Request) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = twoFactorConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Código inválido" }, { status: 400 });
  }

  const admin = await prisma.admin.findUnique({ where: { id: session.adminId } });
  if (!admin?.twoFactorSecret) {
    return NextResponse.json({ error: "Primero generá un código QR nuevo" }, { status: 400 });
  }

  if (!(await verifyTotpToken(parsed.data.code, admin.twoFactorSecret))) {
    return NextResponse.json({ error: "Código incorrecto" }, { status: 400 });
  }

  const backupCodes = generateBackupCodes();
  const backupCodesJson = await hashBackupCodes(backupCodes);

  await prisma.admin.update({
    where: { id: session.adminId },
    data: { twoFactorEnabled: true, twoFactorBackupCodes: backupCodesJson },
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "ENABLE_2FA",
    entity: "Admin",
    entityId: session.adminId,
  });

  return NextResponse.json({ ok: true, backupCodes });
}
