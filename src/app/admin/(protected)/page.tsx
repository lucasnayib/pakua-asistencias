import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { getLocalNow } from "@/lib/time";
import { getSession } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  // El super-admin no tiene escuela propia: no hay dashboard que mostrarle acá.
  if (session.role === "SUPER_ADMIN") redirect("/admin/admins");

  const { date: today } = getLocalNow();

  const [studentsCount, schedulesCount, todayAttendanceCount] = await Promise.all([
    prisma.student.count({ where: { active: true, adminId: session.adminId } }),
    prisma.schedule.count({ where: { adminId: session.adminId } }),
    prisma.attendance.count({ where: { date: today, schedule: { adminId: session.adminId } } }),
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
    </div>
  );
}
