"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { RosterView } from "@/components/attendance/RosterView";
import { Spinner } from "@/components/ui/Spinner";
import { Input } from "@/components/ui/Input";
import { dayOfWeekFromISODate, formatTimeRange, getLocalNow } from "@/lib/time";
import type { RosterResponse, ScheduleListItem } from "@/types";

type ClasesAnterioresClientProps = {
  slug: string;
  adminId: string;
};

export function ClasesAnterioresClient({ slug, adminId }: ClasesAnterioresClientProps) {
  const [date, setDate] = useState(() => getLocalNow().date);
  const [schedules, setSchedules] = useState<ScheduleListItem[] | null>(null);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterResponse | null>(null);
  const [loadingRoster, setLoadingRoster] = useState(false);

  useEffect(() => {
    setSelectedScheduleId(null);
    setRoster(null);
    if (!date) return;
    setLoadingSchedules(true);
    const dayOfWeek = dayOfWeekFromISODate(date);
    fetch(`/api/schedules?dayOfWeek=${dayOfWeek}&adminId=${adminId}`)
      .then((res) => res.json())
      .then((data) => setSchedules(data.schedules ?? []))
      .finally(() => setLoadingSchedules(false));
  }, [date, adminId]);

  useEffect(() => {
    if (!selectedScheduleId || !date) return;
    setLoadingRoster(true);
    fetch(`/api/schedules/${selectedScheduleId}/roster?date=${date}`)
      .then((res) => res.json())
      .then((data) => setRoster(data))
      .finally(() => setLoadingRoster(false));
  }, [selectedScheduleId, date]);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader slug={slug} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold">Clases anteriores</h1>
          <p className="text-sm text-muted-foreground">
            Elegí una fecha y un horario para corregir asistencias de una clase ya finalizada.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <Input
            type="date"
            label="Fecha"
            value={date}
            max={getLocalNow().date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
        </div>

        {loadingSchedules && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" /> Buscando horarios de ese día…
          </div>
        )}

        {!loadingSchedules && schedules && schedules.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay horarios configurados para ese día.</p>
        )}

        {!loadingSchedules && schedules && schedules.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {schedules.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedScheduleId(s.id)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  selectedScheduleId === s.id
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-surface hover:bg-surface-2"
                }`}
              >
                {s.name ? `${s.name} · ` : ""}
                {formatTimeRange(s.startTime, s.endTime)}
                <span className="ml-1 text-xs opacity-70">({s._count.students})</span>
              </button>
            ))}
          </div>
        )}

        {loadingRoster && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" /> Cargando alumnos…
          </div>
        )}

        {!loadingRoster && roster?.schedule && (
          <RosterView scheduleId={roster.schedule.id} date={date} initialRoster={roster.roster} />
        )}
      </main>
    </div>
  );
}
