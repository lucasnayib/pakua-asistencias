import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

/** Ruta pública, sin sesión: resuelve un slug de escuela a { id, displayName }. */
export async function GET(_request: NextRequest, { params }: Params) {
  const { slug } = await params;

  const school = await prisma.admin.findFirst({
    where: { slug, active: true, role: "ADMIN" },
    select: { id: true, displayName: true },
  });

  if (!school) {
    return NextResponse.json({ error: "Escuela no encontrada" }, { status: 404 });
  }

  return NextResponse.json(school);
}
