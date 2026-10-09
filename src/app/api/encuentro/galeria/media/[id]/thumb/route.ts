import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { stat } from "node:fs/promises";
import { requireEncuentroGalleryAccess } from "@/lib/encuentro-gallery-access";
import { streamMediaFile } from "@/lib/encuentro-media";
import { EVENTO_APROBADOS_DIR, EVENTO_THUMBS_DIR, findMediaMeta } from "@/lib/encuentro-storage";

type Params = { params: Promise<{ id: string }> };

// El gate acá es "¿está aprobado?", independiente de dónde viva físicamente la miniatura.
export async function GET(request: NextRequest, { params }: Params) {
  const access = await requireEncuentroGalleryAccess();
  if (access !== true) return access;

  const { id } = await params;
  const meta = await findMediaMeta(EVENTO_APROBADOS_DIR, id);
  if (!meta || meta.kind !== "photo") {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const thumbPath = path.join(EVENTO_THUMBS_DIR, `${id}.webp`);
  const info = await stat(thumbPath).catch(() => null);
  if (!info) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return streamMediaFile(request, thumbPath, "image/webp", info.size);
}
