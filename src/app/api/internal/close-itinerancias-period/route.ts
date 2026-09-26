import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatItineranciaPeriodLabel } from "@/lib/itinerancias";
import { logChange } from "@/lib/audit";
import { pad2 } from "@/lib/time";

/**
 * Job diario (ver scripts/close-itinerancias-period.ts) que archiva solo las actividades de
 * Itinerancias de meses ya vencidos, si el admin no cerró el período a mano antes. El mes en
 * curso nunca se toca (es el período activo), y tampoco se tocan actividades cargadas a futuro
 * (ej. un admin que precarga diciembre en septiembre) — solo se archiva lo que ya pasó.
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

  const slug = process.env.ITINERANCIAS_SCHOOL_SLUG;
  const admin = slug ? await prisma.admin.findFirst({ where: { slug }, select: { id: true } }) : null;
  if (!admin) {
    return NextResponse.json({ ok: true, archivedGroups: [], totalArchived: 0 });
  }

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;

  const active = await prisma.itineranciaActivity.findMany({
    where: { adminId: admin.id, period: null },
    select: { id: true, date: true },
  });

  const groups = new Map<string, string[]>();
  for (const a of active) {
    const yearMonth = a.date.slice(0, 7);
    if (yearMonth >= currentYearMonth) continue;
    const ids = groups.get(yearMonth) ?? [];
    ids.push(a.id);
    groups.set(yearMonth, ids);
  }

  const archivedGroups: { yearMonth: string; label: string; count: number }[] = [];
  let totalArchived = 0;

  for (const [yearMonth, ids] of groups) {
    const [year, month] = yearMonth.split("-").map(Number);
    const label = formatItineranciaPeriodLabel(new Date(year, month - 1, 1));

    await prisma.itineranciaActivity.updateMany({ where: { id: { in: ids } }, data: { period: label } });
    await logChange({
      actor: "Sistema (cierre automático de Itinerancias)",
      adminId: admin.id,
      action: "AUTO_CLOSE_ITINERANCIA_PERIOD",
      entity: "ItineranciaActivity",
      detail: `${label} (${ids.length} actividad(es))`,
    });

    archivedGroups.push({ yearMonth, label, count: ids.length });
    totalArchived += ids.length;
  }

  return NextResponse.json({ ok: true, archivedGroups, totalArchived });
}
