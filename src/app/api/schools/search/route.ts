import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 6;

/**
 * Ruta pública, sin sesión: busca escuelas por nombre para el buscador de la home.
 * A propósito no expone un listado completo (sin `q` no devuelve nada) y limita la
 * cantidad de resultados, para no habilitar un scraping trivial de todas las escuelas.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ schools: [] });
  }

  const schools = await prisma.admin.findMany({
    where: { role: "ADMIN", active: true, approved: true, displayName: { contains: q } },
    select: { slug: true, displayName: true },
    orderBy: { displayName: "asc" },
    take: MAX_RESULTS,
  });

  return NextResponse.json({ schools });
}
