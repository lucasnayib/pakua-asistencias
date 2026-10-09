import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { encuentroGalleryToggleSchema } from "@/lib/validations";
import { setGalleryEnabled } from "@/lib/encuentro-config";
import { logChange } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = encuentroGalleryToggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  await setGalleryEnabled(parsed.data.enabled);
  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "ENCUENTRO_GALLERY_TOGGLE",
    entity: "EncuentroGallery",
    detail: parsed.data.enabled ? "activada" : "desactivada",
  });

  return NextResponse.json({ ok: true });
}
