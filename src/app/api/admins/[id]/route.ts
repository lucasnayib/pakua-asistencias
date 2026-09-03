import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminUpdateSchema } from "@/lib/validations";
import { requireSuperAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";
import { isP2002 } from "@/lib/prisma-errors";
import { notifySchoolApproved, notifySchoolRejected } from "@/lib/email";

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
  // Tampoco se puede cambiar la contraseña ni el mail/teléfono de otra cuenta desde acá
  // (mismo criterio, ver adminUpdateSchema) — cada admin lo cambia por su cuenta, con
  // verificación por mail.
  const { displayName, slug, active, approved } = parsed.data;

  // No permitir que el super-admin se desactive a sí mismo, para evitar quedarse afuera.
  if (id === session.adminId && active === false) {
    return NextResponse.json({ error: "No podés desactivar tu propia cuenta" }, { status: 400 });
  }

  const wasApproving = approved === true && existing.approved === false;

  // El trial de 7 días arranca en la aprobación de la escuela, no en el pago — nunca se
  // toca si las suscripciones todavía no están habilitadas, para no afectar a las escuelas
  // reales mientras se desarrolla esto.
  const startTrial = wasApproving && process.env.SUBSCRIPTIONS_ENABLED === "true";
  const trialDays = Number(process.env.SUBSCRIPTION_TRIAL_DAYS ?? "7");

  let admin;
  try {
    admin = await prisma.admin.update({
      where: { id },
      data: {
        ...(displayName !== undefined ? { displayName } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(active !== undefined ? { active } : {}),
        ...(approved !== undefined ? { approved } : {}),
        ...(startTrial ? { trialEndsAt: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) } : {}),
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
    await notifySchoolApproved({
      contactEmail: admin.contactEmail,
      displayName: admin.displayName,
      username: admin.username,
      slug: admin.slug,
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

  const wasRejectingRequest = existing.approved === false;

  await prisma.admin.delete({ where: { id } });

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "DELETE_ADMIN",
    entity: "Admin",
    entityId: id,
    detail: `${existing.displayName} (${existing.username})`,
  });

  // El mail de "rechazado" solo aplica cuando lo que se borra es una solicitud pendiente,
  // no cuando se elimina una cuenta de escuela ya aprobada (sin datos) por otro motivo.
  if (wasRejectingRequest) {
    await notifySchoolRejected({ contactEmail: existing.contactEmail, displayName: existing.displayName });
  }

  return NextResponse.json({ ok: true });
}
