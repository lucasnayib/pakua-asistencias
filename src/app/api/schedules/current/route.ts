import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRosterForSchedule } from "@/lib/roster";
import { formatTimeShort } from "@/lib/time";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const dayOfWeek = Number(params.get("dayOfWeek"));
  const date = params.get("date");
  const time = params.get("time");

  if (Number.isNaN(dayOfWeek) || !date || !time) {
    return NextResponse.json({ error: "Parámetros dayOfWeek, date y time son obligatorios" }, { status: 400 });
  }

  const shortTime = formatTimeShort(time);

  const schedule = await prisma.schedule.findFirst({
    where: {
      days: { some: { dayOfWeek } },
      startTime: { lte: shortTime },
      endTime: { gt: shortTime },
    },
  });

  if (!schedule) {
    return NextResponse.json({ schedule: null, roster: [], date });
  }

  const result = await getRosterForSchedule(schedule.id, date);
  return NextResponse.json(result);
}
