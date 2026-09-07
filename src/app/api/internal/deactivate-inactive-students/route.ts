import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendInactiveStudentsDeactivatedEmail } from "@/lib/email";
import { logChange } from "@/lib/audit";
import { pad2 } from "@/lib/time";

/**
 * Job diario (corre vía el Programador de tareas de Windows, ver
 * scripts/deactivate-inactive-students.ts) que da de baja sola a los alumnos que dejaron de
 * venir: tienen al menos una asistencia registrada alguna vez, pero ninguna dentro del plazo
 * que configuró cada admin (Admin.inactivityDeactivationDays). Alumnos que nunca tuvieron
 * ninguna asistencia quedan exentos — no se puede saber si "dejaron de venir" si nunca vinieron.
 * No usa sesión de admin — se protege con un secreto simple en el header `x-cron-secret`.
 */
export async function POST(request: Request) {
  const secret = process.env.INTERNAL_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "No configurado" }, { status: 500 });
  }
  if (request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  const todayIso = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

  const admins = await prisma.admin.findMany({
    where: { role: "ADMIN", inactivityDeactivationDays: { not: null } },
    select: { id: true, displayName: true, contactEmail: true, inactivityDeactivationDays: true },
  });

  let deactivated = 0;

  for (const admin of admins) {
    const days = admin.inactivityDeactivationDays;
    if (!days) continue;

    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffIso = `${cutoff.getFullYear()}-${pad2(cutoff.getMonth() + 1)}-${pad2(cutoff.getDate())}`;

    const students = await prisma.student.findMany({
      where: { adminId: admin.id, active: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        attendances: { select: { date: true }, orderBy: { date: "desc" }, take: 1 },
      },
    });

    const toDeactivate = students.filter((s) => {
      const lastDate = s.attendances[0]?.date;
      return lastDate !== undefined && lastDate < cutoffIso;
    });

    if (toDeactivate.length === 0) continue;

    for (const student of toDeactivate) {
      await prisma.student.update({ where: { id: student.id }, data: { active: false } });
      await logChange({
        actor: "Sistema (baja automática por inactividad)",
        adminId: admin.id,
        action: "AUTO_DEACTIVATE_INACTIVE_STUDENT",
        entity: "Student",
        entityId: student.id,
        detail: `Sin asistencia desde antes del ${cutoffIso} (plazo: ${days} días)`,
      });
      deactivated++;
    }

    if (admin.contactEmail) {
      await sendInactiveStudentsDeactivatedEmail({
        contactEmail: admin.contactEmail,
        displayName: admin.displayName,
        days,
        students: toDeactivate.map((s) => ({ firstName: s.firstName, lastName: s.lastName })),
      });
    }
  }

  return NextResponse.json({ ok: true, checkedAdmins: admins.length, deactivated, date: todayIso });
}
