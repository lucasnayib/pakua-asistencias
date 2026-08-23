import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { adminCreateSchema } from "@/lib/validations";
import { requireSuperAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";
import { isP2002, p2002Fields } from "@/lib/prisma-errors";

const adminSelect = {
  id: true,
  username: true,
  displayName: true,
  slug: true,
  role: true,
  active: true,
  approved: true,
  contactEmail: true,
  contactPhone: true,
  createdAt: true,
};

export async function GET() {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  // El super-admin no es una cuenta gestionable desde esta pantalla: nunca aparece en la lista.
  const admins = await prisma.admin.findMany({
    where: { role: "ADMIN" },
    select: adminSelect,
    orderBy: [{ createdAt: "asc" }],
  });

  return NextResponse.json({ admins });
}

export async function POST(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = adminCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const { username, password, displayName, slug } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  let admin;
  try {
    // El rol siempre es "ADMIN": no existe ningún camino para crear un segundo super-admin.
    admin = await prisma.admin.create({
      data: { username, passwordHash, displayName, slug, role: "ADMIN", active: true },
      select: adminSelect,
    });
  } catch (error) {
    if (isP2002(error)) {
      if (p2002Fields(error).includes("slug")) {
        return NextResponse.json({ error: "Esa dirección ya está en uso" }, { status: 409 });
      }
      return NextResponse.json({ error: "Ese nombre de usuario ya está en uso" }, { status: 409 });
    }
    throw error;
  }

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "CREATE_ADMIN",
    entity: "Admin",
    entityId: admin.id,
    detail: `${admin.displayName} (${admin.username}) — ${admin.role}`,
  });

  return NextResponse.json({ admin }, { status: 201 });
}
