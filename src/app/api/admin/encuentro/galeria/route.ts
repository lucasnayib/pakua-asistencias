import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { buildGalleryUrl, readEncuentroConfig } from "@/lib/encuentro-config";

export async function GET() {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const config = await readEncuentroConfig();
  return NextResponse.json({
    galleryEnabled: config.galleryEnabled,
    galleryUrl: buildGalleryUrl(config.galleryToken),
  });
}
