"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { ItineranciaActivityList } from "@/components/admin/ItineranciaActivityList";
import { useItineranciaActivityDialogs } from "@/components/admin/useItineranciaActivityDialogs";
import type { ItineranciaActivityListItem } from "@/types";

type PeriodGroup = {
  period: string;
  items: ItineranciaActivityListItem[];
  maxDate: string;
};

export function ItineranciasAnterioresClient() {
  const [activities, setActivities] = useState<ItineranciaActivityListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());

  const loadActivities = useCallback(() => {
    setLoading(true);
    fetch("/api/itinerancias/activities?archived=1")
      .then((res) => res.json())
      .then((data) => setActivities(data.activities ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const { dialogs, openEdit, openRegistrations, openDelete } = useItineranciaActivityDialogs(loadActivities);

  function togglePeriod(period: string) {
    setExpandedPeriods((current) => {
      const next = new Set(current);
      if (next.has(period)) next.delete(period);
      else next.add(period);
      return next;
    });
  }

  // La etiqueta es texto libre ("Itinerancias Septiembre 2026"), así que no ordena bien
  // alfabéticamente — se ordena por la fecha más reciente de cada grupo en su lugar.
  const groupedByPeriod = new Map<string, ItineranciaActivityListItem[]>();
  for (const a of activities) {
    if (!a.period) continue;
    const group = groupedByPeriod.get(a.period);
    if (group) group.push(a);
    else groupedByPeriod.set(a.period, [a]);
  }
  const periodGroups: PeriodGroup[] = [...groupedByPeriod.entries()]
    .map(([period, items]) => ({
      period,
      items,
      maxDate: items.reduce((max, a) => (a.date > max ? a.date : max), items[0].date),
    }))
    .sort((a, b) => (a.maxDate < b.maxDate ? 1 : a.maxDate > b.maxDate ? -1 : 0));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/itinerancias" className="text-sm text-muted-foreground hover:underline">
          ← Volver a Itinerancias
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Itinerancias anteriores</h1>
        <p className="text-sm text-muted-foreground">
          Actividades de períodos ya cerrados, agrupadas por el nombre con el que se archivaron.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" /> Cargando…
        </div>
      ) : periodGroups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Todavía no cerraste ningún período de Itinerancias.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {periodGroups.map(({ period, items }) => {
            const expanded = expandedPeriods.has(period);
            const totalRegistrations = items.reduce((sum, a) => sum + a._count.studentRegistrations, 0);
            return (
              <div key={period} className="rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => togglePeriod(period)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <div>
                    <p className="font-medium">{period}</p>
                    <p className="text-xs text-muted-foreground">
                      {items.length} actividades · {totalRegistrations} alumno(s) anotados en total
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{expanded ? "Ocultar ▲" : "Ver ▼"}</span>
                </button>
                {expanded && (
                  <div className="border-t border-border p-3">
                    <ItineranciaActivityList
                      activities={items}
                      onEdit={openEdit}
                      onOpenRegistrations={openRegistrations}
                      onDelete={openDelete}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {dialogs}
    </div>
  );
}
