import { prisma } from "@/lib/prisma";
import type { RosterStudent } from "@/types";

export async function getRosterForSchedule(scheduleId: string, date: string) {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: {
      days: true,
      students: {
        where: { student: { active: true } },
        include: { student: true },
        orderBy: { student: { lastName: "asc" } },
      },
    },
  });

  if (!schedule) return null;

  const attendances = await prisma.attendance.findMany({
    where: { scheduleId, date },
  });
  const attendanceByStudent = new Map(attendances.map((a) => [a.studentId, a]));

  const roster: RosterStudent[] = schedule.students.map(({ student }) => {
    const attendance = attendanceByStudent.get(student.id);
    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      photoUrl: student.photoUrl,
      present: Boolean(attendance),
      attendanceId: attendance?.id ?? null,
      time: attendance?.time ?? null,
    };
  });

  return {
    schedule: {
      id: schedule.id,
      name: schedule.name,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      days: schedule.days.map((d) => d.dayOfWeek),
    },
    date,
    roster,
  };
}
