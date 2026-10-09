import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { buildGalleryUrl, regenerateGalleryToken } from "@/lib/encuentro-config";
import { logChange } from "@/lib/audit";

// Regenerar invalida al instante todas las cookies de galería ya repartidas (ver
// requireEncuentroGalleryAccess, que revalida contra config.json en cada request).
export async function POST() {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const config = await regenerateGalleryToken();
  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "ENCUENTRO_GALLERY_TOKEN_REGENERATE",
    entity: "EncuentroGallery",
  });

  return NextResponse.json({
    galleryEnabled: config.galleryEnabled,
    galleryUrl: buildGalleryUrl(config.galleryToken),
  });
}
