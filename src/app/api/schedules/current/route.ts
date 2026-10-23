import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRosterForSchedule } from "@/lib/roster";
import { formatTimeShort } from "@/lib/time";
import { requireSchoolAccess } from "@/lib/school-access";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const dayOfWeek = Number(params.get("dayOfWeek"));
  const date = params.get("date");
  const time = params.get("time");
  const adminId = params.get("adminId");

  if (Number.isNaN(dayOfWeek) || !date || !time || !adminId) {
    return NextResponse.json(
      { error: "Parámetros dayOfWeek, date, time y adminId son obligatorios" },
      { status: 400 }
    );
  }

  const access = await requireSchoolAccess(adminId);
  if (access instanceof NextResponse) return access;

  const shortTime = formatTimeShort(time);

  const schedule = await prisma.schedule.findFirst({
    where: {
      adminId,
      days: { some: { dayOfWeek } },
      startTime: { lte: shortTime },
      endTime: { gt: shortTime },
    },
  });
  // Restricción de ubicación desactivada a pedido explícito (ver itinerancias.ts y
  // api/attendance/route.ts) — nunca se le pide GPS al navegador mientras esté así, aunque la
  // escuela tenga una configuración guardada de antes.
  const requiresLocation = false;

  if (!schedule) {
    return NextResponse.json({ schedule: null, roster: [], date, requiresLocation });
  }

  const result = await getRosterForSchedule(schedule.id, date);
  return NextResponse.json({ ...result, requiresLocation });
}
