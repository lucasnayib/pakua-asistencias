import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { SidebarIcon, type SidebarIconName } from "@/components/admin/SidebarIcon";
import { formatTimeRange, formatTimeShort, getLocalNow, toArgentinaISODate } from "@/lib/time";
import { getSession } from "@/lib/auth";
import { GoToAttendanceLink } from "@/components/admin/GoToAttendanceLink";
import { getMovimientosList } from "@/lib/aranceles-server";
import { calcularKpis, currentMonth, formatMoney, type LedgerRow } from "@/lib/aranceles-calc";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  // El super-admin no tiene escuela propia: no hay dashboard que mostrarle acá.
  if (session.role === "SUPER_ADMIN") redirect("/admin/admins");

  const { date: today, dayOfWeek, time } = getLocalNow();
  const shortNow = formatTimeShort(time);
  const month = currentMonth();
  // "Hoy" para cumpleaños se calcula del lado del servidor (a diferencia de `today`/`dayOfWeek`
  // de arriba, que usan la hora del dispositivo porque son para la toma de asistencia en vivo):
  // necesita la fecha de Argentina, no la del huso horario del servidor — mismo criterio que
  // currentMonth() en aranceles-calc.ts.
  const monthDay = toArgentinaISODate(new Date()).slice(5); // "MM-DD"

  const [studentsCount, schedulesCount, todayAttendanceCount, todaySchedules, admin, movimientosDelMes, birthdayStudents] =
    await Promise.all([
      prisma.student.count({ where: { active: true, adminId: session.adminId } }),
      prisma.schedule.count({ where: { adminId: session.adminId } }),
      prisma.attendance.count({ where: { date: today, schedule: { adminId: session.adminId } } }),
      prisma.schedule.findMany({
        where: { adminId: session.adminId, days: { some: { dayOfWeek } } },
        orderBy: { startTime: "asc" },
      }),
      prisma.admin.findUnique({ where: { id: session.adminId }, select: { slug: true } }),
      getMovimientosList(session.adminId, { month, tipo: "INGRESO" }),
      // birthDate se guarda como "YYYY-MM-DD": un alumno cumple años hoy si sus últimos 5
      // caracteres ("MM-DD") coinciden con los de hoy, sin importar el año de nacimiento.
      prisma.student.findMany({
        where: { active: true, adminId: session.adminId, birthDate: { endsWith: `-${monthDay}` } },
        select: { id: true, firstName: true, lastName: true },
        orderBy: { firstName: "asc" },
      }),
    ]);

  const upcomingSchedules = todaySchedules.filter((s) => s.endTime > shortNow);

  // "Ingresos del mes" sale de los mismos datos reales que ya usa la pestaña Resumen de
  // Aranceles (ver src/lib/aranceles-calc.ts) — nada inventado ni aproximado. getMovimientosList
  // ya devuelve las filas normalizadas (movimientos sueltos + cuotas pagadas), así que alcanza
  // con llevarlas al shape de LedgerRow sin pasar de nuevo por movimientoToLedgerRow/pagoToLedgerRow
  // (esos esperan las filas crudas de Prisma, no esta vista ya combinada).
  const ledgerRows: LedgerRow[] = movimientosDelMes.map((m) => ({
    tipo: m.tipo,
    categoria: m.categoria,
    concepto: m.concepto,
    amount: m.amount,
    month: m.month ?? m.date.slice(0, 7),
    estado: m.estado,
    escuelaPorcentaje: m.escuelaPorcentaje,
  }));
  const ingresosDelMes = calcularKpis(ledgerRows).ingresosTotales;

  const stats: { label: string; value: string | number; icon: SidebarIconName }[] = [
    { label: "Alumnos activos", value: studentsCount, icon: "users" },
    { label: "Asistencias registradas hoy", value: todayAttendanceCount, icon: "clipboard-check" },
    { label: "Horarios configurados", value: schedulesCount, icon: "clock" },
    { label: "Ingresos del mes", value: formatMoney(ingresosDelMes), icon: "wallet" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Resumen</h1>
          <p className="text-sm text-muted-foreground">Estado general de la escuela Pakua</p>
        </div>
        <GoToAttendanceLink
          href={admin?.slug ? `/escuela/${admin.slug}` : "/"}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90"
        >
          Ir a toma de asistencia
        </GoToAttendanceLink>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="flex min-w-0 flex-col gap-3 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <SidebarIcon name={s.icon} className="h-[18px] w-[18px]" />
            </div>
            <div className="min-w-0">
              <p className="break-words text-xl font-semibold tabular-nums sm:text-2xl">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {birthdayStudents.length > 0 && (
        <Card className="flex flex-col gap-1.5 border-accent/40 bg-accent/5 p-5">
          {birthdayStudents.map((s) => (
            <p key={s.id} className="text-sm font-medium">
              Hoy es el cumpleaños de {s.firstName} {s.lastName}
            </p>
          ))}
        </Card>
      )}

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
