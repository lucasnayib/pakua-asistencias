import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { adminUpdateSchema } from "@/lib/validations";
import { requireSuperAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";
import { isP2002 } from "@/lib/prisma-errors";

type Params = { params: Promise<{ id: string }> };

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

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const existing = await prisma.admin.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = adminUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  // El rol nunca se puede cambiar desde esta ruta (ni al crear, ni al editar): no hay ningún
  // camino de código que pueda crear o promover un segundo super-admin. Si el cliente manda
  // "role" en el body, se ignora por completo (ni siquiera llega acá, adminUpdateSchema no lo admite).
  const { displayName, slug, active, approved, password } = parsed.data;

  // No permitir que el super-admin se desactive a sí mismo, para evitar quedarse afuera.
  if (id === session.adminId && active === false) {
    return NextResponse.json({ error: "No podés desactivar tu propia cuenta" }, { status: 400 });
  }

  const wasApproving = approved === true && existing.approved === false;

  const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;

  let admin;
  try {
    admin = await prisma.admin.update({
      where: { id },
      data: {
        ...(displayName !== undefined ? { displayName } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(active !== undefined ? { active } : {}),
        ...(approved !== undefined ? { approved } : {}),
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: adminSelect,
    });
  } catch (error) {
    if (isP2002(error)) {
      return NextResponse.json({ error: "Esa dirección ya está en uso" }, { status: 409 });
    }
    throw error;
  }

  if (wasApproving) {
    await logChange({
      actor: session.displayName,
      adminId: session.adminId,
      action: "APPROVE_ADMIN",
      entity: "Admin",
      entityId: admin.id,
      detail: `${admin.displayName} (${admin.username})`,
    });
  }

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "UPDATE_ADMIN",
    entity: "Admin",
    entityId: admin.id,
    detail: `${admin.displayName} (${admin.username}) — ${admin.role}${admin.active ? "" : " — desactivado"}`,
  });

  return NextResponse.json({ admin });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const existing = await prisma.admin.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  }

  // Nunca se puede borrar al super-admin por esta vía (la UI ni siquiera lo muestra, pero
  // se valida acá también por las dudas).
  if (existing.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "No se puede eliminar la cuenta de super-admin" }, { status: 403 });
  }

  const [studentCount, scheduleCount, orientadorCount, exportLogCount] = await Promise.all([
    prisma.student.count({ where: { adminId: id } }),
    prisma.schedule.count({ where: { adminId: id } }),
    prisma.orientador.count({ where: { adminId: id } }),
    prisma.exportLog.count({ where: { adminId: id } }),
  ]);

  if (studentCount > 0 || scheduleCount > 0 || orientadorCount > 0 || exportLogCount > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: la cuenta tiene datos asociados. Desactivala en su lugar." },
      { status: 400 }
    );
  }

  await prisma.admin.delete({ where: { id } });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "DELETE_ADMIN",
    entity: "Admin",
    entityId: id,
    detail: `${existing.displayName} (${existing.username})`,
  });

  return NextResponse.json({ ok: true });
}
