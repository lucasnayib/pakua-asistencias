import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";

export async function POST() {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  await prisma.admin.update({
    where: { id: session.adminId },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: null },
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "DISABLE_2FA",
    entity: "Admin",
    entityId: session.adminId,
  });

  return NextResponse.json({ ok: true });
}
