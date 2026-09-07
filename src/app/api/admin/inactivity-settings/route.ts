import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { inactivitySettingsSchema } from "@/lib/validations";
import { logChange } from "@/lib/audit";

/** Cada admin configura la baja automática por inactividad de SU PROPIA escuela. */
export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const admin = await prisma.admin.findUnique({
    where: { id: session.adminId },
    select: { inactivityDeactivationDays: true },
  });

  return NextResponse.json({ inactivityDeactivationDays: admin?.inactivityDeactivationDays ?? null });
}

export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = inactivitySettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const { inactivityDeactivationDays } = parsed.data;

  await prisma.admin.update({
    where: { id: session.adminId },
    data: { inactivityDeactivationDays },
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: inactivityDeactivationDays === null ? "DISABLE_INACTIVITY_DEACTIVATION" : "UPDATE_INACTIVITY_DEACTIVATION",
    entity: "Admin",
    entityId: session.adminId,
    detail: inactivityDeactivationDays === null ? undefined : `${inactivityDeactivationDays} días`,
  });

  return NextResponse.json({ ok: true });
}
