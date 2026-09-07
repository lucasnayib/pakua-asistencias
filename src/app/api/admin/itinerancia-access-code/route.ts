import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { itineranciaAccessCodeSchema } from "@/lib/validations";
import { requireItineranciaAdminAccess } from "@/lib/itinerancias";
import { logChange } from "@/lib/audit";

/** El admin de Itinerancias define/cambia su código propio de acceso público a esa sección. */
export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const admin = await prisma.admin.findUnique({
    where: { id: session.adminId },
    select: { itineranciaAccessCodeHash: true },
  });

  return NextResponse.json({ hasCode: admin?.itineranciaAccessCodeHash != null });
}

export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const denied = await requireItineranciaAdminAccess(session.adminId);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = itineranciaAccessCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const { code } = parsed.data;
  const itineranciaAccessCodeHash = code === null ? null : await bcrypt.hash(code, 10);

  await prisma.admin.update({ where: { id: session.adminId }, data: { itineranciaAccessCodeHash } });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "UPDATE_ITINERANCIA_ACCESS_CODE",
    entity: "Admin",
    entityId: session.adminId,
  });

  return NextResponse.json({ ok: true });
}
