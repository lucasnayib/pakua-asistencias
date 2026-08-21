"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { ExportButton } from "@/components/export/ExportButton";
import { formatDateEs, formatTimeRange, formatTimeShort, getLocalNow } from "@/lib/time";
import type { ScheduleListItem, StudentListItem } from "@/types";

type AttendanceRow = {
  id: string;
  date: string;
  time: string;
  status: string;
  student: { id: string; firstName: string; lastName: string };
  schedule: { id: string; name: string | null; startTime: string; endTime: string };
};

type HistorialClientProps = {
  slug: string;
  adminId: string;
};

export function HistorialClient({ slug, adminId }: HistorialClientProps) {
  const today = getLocalNow().date;
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [studentId, setStudentId] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleListItem[]>([]);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/students?includeInactive=1&adminId=${adminId}`)
      .then((res) => res.json())
      .then((data) => setStudents(data.students ?? []));
    fetch(`/api/schedules?adminId=${adminId}`)
      .then((res) => res.json())
      .then((data) => setSchedules(data.schedules ?? []));
  }, [adminId]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ adminId });
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (studentId) params.set("studentId", studentId);
    if (scheduleId) params.set("scheduleId", scheduleId);

    fetch(`/api/attendance/query?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setRows(data.attendances ?? []))
      .finally(() => setLoading(false));
  }, [adminId, dateFrom, dateTo, studentId, scheduleId]);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader slug={slug} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Historial de asistencias</h1>
            <p className="text-sm text-muted-foreground">Consultá por fecha, alumno u horario.</p>
          </div>
          <ExportButton
            dateFrom={dateFrom}
            dateTo={dateTo}
            scheduleId={scheduleId || undefined}
            adminId={adminId}
            label="Exportar rango"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Input type="date" label="Desde" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" label="Hasta" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Select label="Alumno" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Todos</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.lastName}, {s.firstName}
              </option>
            ))}
          </Select>
          <Select label="Horario" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}>
            <option value="">Todos</option>
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name ? `${s.name} · ` : ""}
                {formatTimeRange(s.startTime, s.endTime)}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" /> Cargando…
          </div>
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No hay asistencias registradas con estos filtros.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Alumno</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Horario</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id} className="bg-surface">
                    <td className="px-4 py-3 font-medium">
                      {row.student.lastName}, {row.student.firstName}
                    </td>
                    <td className="px-4 py-3">{formatDateEs(row.date)}</td>
                    <td className="px-4 py-3">{formatTimeShort(row.time)}</td>
                    <td className="px-4 py-3">
                      {row.schedule.name ? `${row.schedule.name} · ` : ""}
                      {formatTimeRange(row.schedule.startTime, row.schedule.endTime)}
                    </td>
                    <td className="px-4 py-3">{row.status === "PRESENTE" ? "Presente" : row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
