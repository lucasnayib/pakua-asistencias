import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { formatTimeRange, formatTimeShort, getLocalNow } from "@/lib/time";
import { getSession } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  // El super-admin no tiene escuela propia: no hay dashboard que mostrarle acá.
  if (session.role === "SUPER_ADMIN") redirect("/admin/admins");

  const { date: today, dayOfWeek, time } = getLocalNow();
  const shortNow = formatTimeShort(time);

  const [studentsCount, schedulesCount, todayAttendanceCount, todaySchedules] = await Promise.all([
    prisma.student.count({ where: { active: true, adminId: session.adminId } }),
    prisma.schedule.count({ where: { adminId: session.adminId } }),
    prisma.attendance.count({ where: { date: today, schedule: { adminId: session.adminId } } }),
    prisma.schedule.findMany({
      where: { adminId: session.adminId, days: { some: { dayOfWeek } } },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const upcomingSchedules = todaySchedules.filter((s) => s.endTime > shortNow);

  const stats = [
    { label: "Alumnos activos", value: studentsCount },
    { label: "Horarios configurados", value: schedulesCount },
    { label: "Asistencias registradas hoy", value: todayAttendanceCount },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Resumen</h1>
          <p className="text-sm text-muted-foreground">Estado general de la escuela Pakua</p>
        </div>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90"
        >
          Ir a toma de asistencia
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-3xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <p className="text-sm font-medium">Próximas clases de hoy</p>
        {upcomingSchedules.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No quedan más clases por hoy.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {upcomingSchedules.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-full border border-border bg-surface-2 py-2 pl-4 pr-2"
              >
                <span className="truncate text-sm font-medium">{s.name || "Clase sin nombre"}</span>
                <span className="shrink-0 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                  {formatTimeRange(s.startTime, s.endTime)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
