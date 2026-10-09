import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireEncuentroGalleryAccess } from "@/lib/encuentro-gallery-access";
import { streamMediaFile } from "@/lib/encuentro-media";
import { EVENTO_APROBADOS_DIR, findMediaMeta } from "@/lib/encuentro-storage";

type Params = { params: Promise<{ id: string }> };

// El gate es "¿está aprobado?" — ningún pendiente es alcanzable por esta ruta, sin importar
// si alguien adivina el id (404, no 403 ni ningún detalle que confirme que existe).
export async function GET(request: NextRequest, { params }: Params) {
  const access = await requireEncuentroGalleryAccess();
  if (access !== true) return access;

  const { id } = await params;
  const meta = await findMediaMeta(EVENTO_APROBADOS_DIR, id);
  if (!meta) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const filePath = path.join(EVENTO_APROBADOS_DIR, `${id}.${meta.ext}`);
  return streamMediaFile(request, filePath, meta.mime, meta.size);
}
