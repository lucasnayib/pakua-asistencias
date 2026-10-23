import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";
import { tipoArancelCreateSchema } from "@/lib/validations";
import { autoEnrollStudentsForTipo } from "@/lib/aranceles-server";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "1";

  const tipos = await prisma.tipoArancel.findMany({
    where: { adminId: session.adminId, ...(includeInactive ? {} : { active: true }) },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ tipos });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = tipoArancelCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const tipo = await prisma.tipoArancel.create({
    data: { ...parsed.data, adminId: session.adminId },
  });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "CREATE_TIPO_ARANCEL",
    entity: "TipoArancel",
    entityId: tipo.id,
    detail: `${tipo.name} ($${tipo.amount})`,
  });

  // Si ya había alumnos con esta formación cargada (Yoga, Arte Marcial, etc.), anotarlos
  // solos en vez de esperar a que alguien edite cada ficha — ver src/lib/aranceles-server.ts.
  await autoEnrollStudentsForTipo(session.adminId, tipo.id, tipo.name);

  return NextResponse.json({ tipo }, { status: 201 });
}
