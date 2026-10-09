import { NextRequest, NextResponse } from "next/server";
import { requireEncuentroGalleryAccess } from "@/lib/encuentro-gallery-access";
import { EVENTO_APROBADOS_DIR, listMediaMeta } from "@/lib/encuentro-storage";

const PAGE_SIZE = 30;

// Único listado público de la feature: paginado a propósito (el pedido del lado de
// rendimiento/ancho de banda), más nuevo primero para que lo recién aprobado aparezca arriba.
export async function GET(request: NextRequest) {
  const access = await requireEncuentroGalleryAccess();
  if (access !== true) return access;

  const offset = Math.max(0, Number(request.nextUrl.searchParams.get("offset") ?? "0") || 0);

  const all = await listMediaMeta(EVENTO_APROBADOS_DIR);
  all.reverse(); // listMediaMeta ordena más viejo primero; acá queremos más nuevo primero

  const page = all.slice(offset, offset + PAGE_SIZE).map((item) => ({
    id: item.id,
    kind: item.kind,
    uploadedAt: item.uploadedAt,
  }));

  return NextResponse.json({ items: page, total: all.length, hasMore: offset + PAGE_SIZE < all.length });
}
