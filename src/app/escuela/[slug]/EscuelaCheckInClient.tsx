"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { RosterView } from "@/components/attendance/RosterView";
import { ExportButton } from "@/components/export/ExportButton";
import { Spinner } from "@/components/ui/Spinner";
import { dayName, formatTimeRange, getLocalNow } from "@/lib/time";
import type { RosterResponse } from "@/types";

const REFRESH_MS = 30_000;

type EscuelaCheckInClientProps = {
  slug: string;
  adminId: string;
};

export function EscuelaCheckInClient({ slug, adminId }: EscuelaCheckInClientProps) {
  const [data, setData] = useState<RosterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => getLocalNow());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const local = getLocalNow();
      setNow(local);
      try {
        const params = new URLSearchParams({
          dayOfWeek: String(local.dayOfWeek),
          date: local.date,
          time: local.time,
          adminId,
        });
        const res = await fetch(`/api/schedules/current?${params.toString()}`, { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setError(res.ok ? null : (json.error ?? "No se pudo cargar la clase actual"));
        }
      } catch {
        if (!cancelled) setError("Error de conexión");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [adminId]);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader slug={slug} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        {loading && (
          <div className="flex flex-1 items-center justify-center py-24 text-muted-foreground">
            <Spinner className="h-8 w-8" />
          </div>
        )}

        {!loading && error && (
          <p className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">{error}</p>
        )}

        {!loading && !error && data?.schedule && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {dayName(now.dayOfWeek)} · Clase en curso
                </p>
                <h1 className="text-2xl font-semibold sm:text-3xl">
                  {data.schedule.name || formatTimeRange(data.schedule.startTime, data.schedule.endTime)}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {formatTimeRange(data.schedule.startTime, data.schedule.endTime)}
                </p>
              </div>
              <ExportButton
                dateFrom={now.date}
                dateTo={now.date}
                adminId={adminId}
                label="Exportar asistencias del día"
              />
            </div>

            <RosterView
              scheduleId={data.schedule.id}
              date={now.date}
              initialRoster={data.roster}
              requiresLocation={data.requiresLocation}
            />
          </>
        )}

        {!loading && !error && !data?.schedule && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-24 text-center">
            <p className="text-lg font-medium">No hay ninguna clase en este horario</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {dayName(now.dayOfWeek)}, {now.time.slice(0, 5)} hs. Cuando empiece un horario configurado, los
              alumnos van a aparecer acá automáticamente.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
