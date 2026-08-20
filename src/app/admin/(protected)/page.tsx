import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { getLocalNow } from "@/lib/time";

export default async function AdminDashboardPage() {
  const { date: today } = getLocalNow();

  const [studentsCount, schedulesCount, todayAttendanceCount, recentLogs] = await Promise.all([
    prisma.student.count({ where: { active: true } }),
    prisma.schedule.count(),
    prisma.attendance.count({ where: { date: today } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

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
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Última actividad</h2>
        {recentLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay actividad registrada.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {recentLogs.map((log) => (
              <li key={log.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="font-medium">{log.actor}</span> — {log.action}
                  {log.detail ? ` (${log.detail})` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString("es-AR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
