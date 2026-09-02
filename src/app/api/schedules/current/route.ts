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

  const [schedule, admin] = await Promise.all([
    prisma.schedule.findFirst({
      where: {
        adminId,
        days: { some: { dayOfWeek } },
        startTime: { lte: shortTime },
        endTime: { gt: shortTime },
      },
    }),
    prisma.admin.findUnique({
      where: { id: adminId },
      select: { latitude: true, longitude: true, attendanceRadiusMeters: true },
    }),
  ]);
  const requiresLocation =
    admin?.latitude != null && admin.longitude != null && admin.attendanceRadiusMeters != null;

  if (!schedule) {
    return NextResponse.json({ schedule: null, roster: [], date, requiresLocation });
  }

  const result = await getRosterForSchedule(schedule.id, date);
  return NextResponse.json({ ...result, requiresLocation });
}
