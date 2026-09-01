import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";
import { generateQrDataUrl, generateTotpSecret } from "@/lib/two-factor";

/**
 * Genera un secreto TOTP nuevo (todavía no activo: twoFactorEnabled sigue en false hasta
 * que se confirme con un código real en /api/admin/two-factor/confirm) y devuelve el QR
 * para escanear.
 */
export async function POST() {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const secret = generateTotpSecret();
  await prisma.admin.update({
    where: { id: session.adminId },
    data: { twoFactorSecret: secret, twoFactorEnabled: false, twoFactorBackupCodes: null },
  });

  const qrDataUrl = await generateQrDataUrl(session.username, secret);
  return NextResponse.json({ secret, qrDataUrl });
}
