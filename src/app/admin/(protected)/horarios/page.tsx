"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ScheduleFormDialog } from "@/components/admin/ScheduleFormDialog";
import { ScheduleCalendarView } from "@/components/admin/ScheduleCalendarView";
import { dayName, formatTimeRange } from "@/lib/time";
import type { ScheduleListItem } from "@/types";

type ViewMode = "list" | "calendar";

export default function HorariosAdminPage() {
  const [schedules, setSchedules] = useState<ScheduleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleListItem | null>(null);
  const [deleting, setDeleting] = useState<ScheduleListItem | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSchedules = useCallback(() => {
    setLoading(true);
    fetch("/api/schedules")
      .then((res) => res.json())
      .then((data) => setSchedules(data.schedules ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/schedules/${deleting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo eliminar el horario");
        return;
      }
      toast.success("Horario eliminado");
      setDeleting(null);
      loadSchedules();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Horarios</h1>
          <p className="text-sm text-muted-foreground">Días, hora de inicio y fin de cada clase</p>
        </div>
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
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Nuevo horario
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" /> Cargando…
        </div>
      ) : schedules.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Todavía no creaste ningún horario.
        </p>
      ) : viewMode === "calendar" ? (
        <ScheduleCalendarView
          schedules={schedules}
          onEdit={(s) => {
            setEditing(s);
            setFormOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((s) => (
            <Card key={s.id} className="flex flex-col gap-2 p-4">
              <p className="font-semibold">{s.name || formatTimeRange(s.startTime, s.endTime)}</p>
              <p className="text-sm text-muted-foreground">{formatTimeRange(s.startTime, s.endTime)}</p>
              <p className="text-xs text-muted-foreground">
                {s.days.map((d) => dayName(d.dayOfWeek)).join(", ")}
              </p>
              <p className="text-xs text-muted-foreground">{s._count.students} alumnos asignados</p>
              <div className="mt-1 flex gap-3 text-xs">
                <button
                  className="text-muted-foreground hover:underline"
                  onClick={() => {
                    setEditing(s);
                    setFormOpen(true);
                  }}
                >
                  Editar
                </button>
                <button className="text-danger hover:underline" onClick={() => setDeleting(s)}>
                  Eliminar
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ScheduleFormDialog
        open={formOpen}
        schedule={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          loadSchedules();
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar horario"
        message={
          deleting
            ? `Se eliminará "${deleting.name || formatTimeRange(deleting.startTime, deleting.endTime)}". Si ya tiene asistencias registradas, no podrá eliminarse.`
            : ""
        }
        confirmLabel="Eliminar"
        danger
        loading={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
