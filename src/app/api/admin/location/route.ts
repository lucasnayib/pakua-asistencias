import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { locationSettingsSchema } from "@/lib/validations";
import { logChange } from "@/lib/audit";

/**
 * Cada admin configura la ubicación de SU PROPIA escuela — nunca la de otra. Los tres
 * campos van juntos: o los tres tienen valor, o los tres quedan en null (sin restricción).
 */
export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = locationSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const { latitude, longitude, attendanceRadiusMeters } = parsed.data;
  const allNull = latitude === null && longitude === null && attendanceRadiusMeters === null;
  const allSet = latitude !== null && longitude !== null && attendanceRadiusMeters !== null;
  if (!allNull && !allSet) {
    return NextResponse.json(
      { error: "Completá ubicación y radio juntos, o dejalos los tres vacíos para desactivar la restricción" },
      { status: 400 }
    );
  }

  await prisma.admin.update({
    where: { id: session.adminId },
    data: { latitude, longitude, attendanceRadiusMeters },
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: allNull ? "DISABLE_LOCATION_RESTRICTION" : "UPDATE_LOCATION_RESTRICTION",
    entity: "Admin",
    entityId: session.adminId,
  });

  return NextResponse.json({ ok: true });
}
