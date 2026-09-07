"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ItineranciaAccessCodeSettings } from "@/components/admin/ItineranciaAccessCodeSettings";
import { ItineranciaActivityFormDialog } from "@/components/admin/ItineranciaActivityFormDialog";
import { ItineranciaRegistrationsDialog } from "@/components/admin/ItineranciaRegistrationsDialog";
import { formatDateEs, formatTimeRange } from "@/lib/time";
import type { ItineranciaActivityListItem } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  EVALUACION: "Evaluación",
  SEMINARIO: "Seminario",
  CURSO: "Curso",
  OTRO: "Otro",
};

export function ItineranciasAdminClient() {
  const [activities, setActivities] = useState<ItineranciaActivityListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ItineranciaActivityListItem | null>(null);
  const [registrationsFor, setRegistrationsFor] = useState<ItineranciaActivityListItem | null>(null);
  const [deleting, setDeleting] = useState<ItineranciaActivityListItem | null>(null);
  const [busy, setBusy] = useState(false);

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

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(activity: ItineranciaActivityListItem) {
    setEditing(activity);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/itinerancias/activities/${deleting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo eliminar la actividad");
        return;
      }
      toast.success("Actividad eliminada");
      setDeleting(null);
      loadActivities();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Itinerancias</h1>
        <p className="text-sm text-muted-foreground">
          Actividades de este período: evaluaciones, seminarios, cursos y otras propuestas para
          que alumnos y orientadores se anoten desde su celular.
        </p>
      </div>

      <ItineranciaAccessCodeSettings />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Actividades</h2>
        <Button onClick={openCreate}>Nueva actividad</Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" /> Cargando…
        </div>
      ) : activities.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Todavía no creaste ninguna actividad.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((a) => (
            <Card key={a.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{a.title}</p>
                <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs">
                  {CATEGORY_LABELS[a.category] ?? a.category}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDateEs(a.date)} · {formatTimeRange(a.startTime, a.endTime)}
              </p>
              <p className="text-xs text-muted-foreground">
                {a._count.studentRegistrations} alumno(s), {a._count.orientadorRegistrations} orientador(es)
                anotados
              </p>
              <div className="mt-1 flex flex-wrap gap-2 text-xs">
                <button className="text-muted-foreground hover:underline" onClick={() => openEdit(a)}>
                  Editar
                </button>
                <button className="text-muted-foreground hover:underline" onClick={() => setRegistrationsFor(a)}>
                  Ver inscriptos
                </button>
                <a
                  className="text-muted-foreground hover:underline"
                  href={`/api/itinerancias/activities/${a.id}/registrations/export`}
                >
                  Exportar
                </a>
                <button className="text-danger hover:underline" onClick={() => setDeleting(a)}>
                  Eliminar
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ItineranciaActivityFormDialog
        open={formOpen}
        activity={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          loadActivities();
        }}
      />

      <ItineranciaRegistrationsDialog
        open={registrationsFor !== null}
        activity={registrationsFor}
        onClose={() => setRegistrationsFor(null)}
        onChanged={loadActivities}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar actividad"
        message={
          deleting
            ? `Esta acción borra "${deleting.title}" y todas sus inscripciones de forma permanente.`
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
