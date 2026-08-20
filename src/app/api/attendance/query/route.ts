import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const date = params.get("date");
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");
  const studentId = params.get("studentId");
  const scheduleId = params.get("scheduleId");

  const where: Prisma.AttendanceWhereInput = {};
  if (date) where.date = date;
  else if (dateFrom || dateTo) {
    where.date = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }
  if (studentId) where.studentId = studentId;
  if (scheduleId) where.scheduleId = scheduleId;

  const attendances = await prisma.attendance.findMany({
    where,
    include: { student: true, schedule: true },
    orderBy: [{ date: "desc" }, { time: "desc" }],
    take: 1000,
  });

  return NextResponse.json({
    attendances: attendances.map((a) => ({
      id: a.id,
      date: a.date,
      time: a.time,
      status: a.status,
      student: { id: a.student.id, firstName: a.student.firstName, lastName: a.student.lastName },
      schedule: {
        id: a.schedule.id,
        name: a.schedule.name,
        startTime: a.schedule.startTime,
        endTime: a.schedule.endTime,
      },
    })),
  });
}
