import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleSchema } from "@/lib/validations";
import { getSession } from "@/lib/auth";
import { logChange } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const dayOfWeekParam = request.nextUrl.searchParams.get("dayOfWeek");
  const dayOfWeek = dayOfWeekParam !== null ? Number(dayOfWeekParam) : undefined;

  const schedules = await prisma.schedule.findMany({
    where: dayOfWeek !== undefined && !Number.isNaN(dayOfWeek) ? { days: { some: { dayOfWeek } } } : {},
    include: {
      days: true,
      _count: { select: { students: true } },
    },
    orderBy: [{ startTime: "asc" }],
  });

  return NextResponse.json({ schedules });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const { name, startTime, endTime, days } = parsed.data;
  const schedule = await prisma.schedule.create({
    data: {
      name: name || null,
      startTime,
      endTime,
      days: { create: days.map((dayOfWeek) => ({ dayOfWeek })) },
    },
    include: { days: true },
  });

  const session = await getSession();
  await logChange({
    actor: session?.username ?? "admin",
    action: "CREATE_SCHEDULE",
    entity: "Schedule",
    entityId: schedule.id,
    detail: `${schedule.name ?? ""} ${schedule.startTime}-${schedule.endTime}`.trim(),
  });

  return NextResponse.json({ schedule }, { status: 201 });
}
