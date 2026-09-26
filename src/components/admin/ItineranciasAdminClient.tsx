"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { ItineranciaAccessCodeSettings } from "@/components/admin/ItineranciaAccessCodeSettings";
import { ItineranciaCalendarView } from "@/components/admin/ItineranciaCalendarView";
import { ItineranciaActivityList } from "@/components/admin/ItineranciaActivityList";
import { ItineranciaClosePeriodDialog } from "@/components/admin/ItineranciaClosePeriodDialog";
import { useItineranciaActivityDialogs } from "@/components/admin/useItineranciaActivityDialogs";
import type { ItineranciaActivityListItem } from "@/types";

type ViewMode = "list" | "calendar";

export function ItineranciasAdminClient() {
  const [activities, setActivities] = useState<ItineranciaActivityListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [closePeriodOpen, setClosePeriodOpen] = useState(false);

  const loadActivities = useCallback(() => {
    setLoading(true);
    fetch("/api/itinerancias/activities")
      .then((res) => res.json())
      .then((data) => setActivities(data.activities ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const { dialogs, openCreate, openEdit, openRegistrations, openDelete } =
    useItineranciaActivityDialogs(loadActivities);

  const query = search.trim().toLowerCase();
  const filteredActivities = query
    ? activities.filter((a) => a.title.toLowerCase().includes(query))
    : activities;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Itinerancias</h1>
        <p className="text-sm text-muted-foreground">
          Actividades del período en curso: evaluaciones, seminarios, cursos y otras propuestas
          para que los alumnos se anoten desde su celular.
        </p>
      </div>

      <ItineranciaAccessCodeSettings />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Actividades</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-border p-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                viewMode === "list" ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-surface-2"
              }`}
            >
              Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                viewMode === "calendar" ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-surface-2"
              }`}
            >
              Calendario
            </button>
          </div>
          <Button variant="secondary" onClick={() => setClosePeriodOpen(true)}>
            Cerrar itinerancia actual
          </Button>
          <Button onClick={openCreate}>Nueva actividad</Button>
        </div>
      </div>

      <Link href="/admin/itinerancias/anteriores" className="text-sm text-muted-foreground hover:underline">
        Itinerancias anteriores →
      </Link>

      <Input
        placeholder="Buscar actividad por nombre…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" /> Cargando…
        </div>
      ) : activities.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Todavía no creaste ninguna actividad.
        </p>
      ) : filteredActivities.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Ninguna actividad coincide con esa búsqueda.
        </p>
      ) : viewMode === "calendar" ? (
        <ItineranciaCalendarView activities={filteredActivities} onEdit={openEdit} />
      ) : (
        <ItineranciaActivityList
          activities={filteredActivities}
          onEdit={openEdit}
          onOpenRegistrations={openRegistrations}
          onDelete={openDelete}
        />
      )}

      {dialogs}

      <ItineranciaClosePeriodDialog
        open={closePeriodOpen}
        activeCount={activities.length}
        onClose={() => setClosePeriodOpen(false)}
        onClosed={loadActivities}
      />
    </div>
  );
}
