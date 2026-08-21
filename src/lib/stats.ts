import { prisma } from "@/lib/prisma";

export type StudentStat = {
  studentId: string;
  firstName: string;
  lastName: string;
  presentCount: number;
  expectedCount: number;
  percentage: number;
};

function countOccurrences(days: Set<number>, from: Date, to: Date): number {
  if (days.size === 0 || from > to) return 0;
  let count = 0;
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cursor <= end) {
    if (days.has(cursor.getDay())) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export async function getStudentStats(adminId: string): Promise<StudentStat[]> {
  const today = new Date();

  const students = await prisma.student.findMany({
    where: { active: true, adminId },
    include: {
      schedules: { include: { schedule: { include: { days: true } } } },
      attendances: { where: { status: "PRESENTE" } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return students.map((student) => {
    const expectedCount = student.schedules.reduce((total, assignment) => {
      const days = new Set(assignment.schedule.days.map((d) => d.dayOfWeek));
      return total + countOccurrences(days, assignment.createdAt, today);
    }, 0);

    const presentCount = student.attendances.length;
    const percentage = expectedCount > 0 ? Math.round((presentCount / expectedCount) * 1000) / 10 : 0;

    return {
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      presentCount,
      expectedCount,
      percentage,
    };
  });
}
