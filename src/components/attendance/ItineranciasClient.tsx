"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StudentCard } from "@/components/students/StudentCard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { formatDateEs, formatTimeRange } from "@/lib/time";
import type { ItineranciaPerson, ItineranciaPublicActivity, ItineranciaPublicResponse } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  EVALUACION: "Evaluación",
  SEMINARIO: "Seminario",
  CURSO: "Curso",
  OTRO: "Otro",
};

type ItineranciasClientProps = {
  adminId: string;
};

type PendingRegistration = {
  activity: ItineranciaPublicActivity;
  student: ItineranciaPerson;
};

export function ItineranciasClient({ adminId }: ItineranciasClientProps) {
  const [data, setData] = useState<ItineranciaPublicResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<PendingRegistration | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetch(`/api/itinerancias/public?adminId=${adminId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [adminId]);

  async function handleConfirm() {
    if (!pending) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/itinerancias/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId: pending.activity.id, studentId: pending.student.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? "No se pudo registrar la inscripción");
        return;
      }
      setData((current) => {
        if (!current) return current;
        return {
          ...current,
          activities: current.activities.map((a) =>
            a.id === pending.activity.id
              ? { ...a, registeredStudentIds: [...a.registeredStudentIds, pending.student.id] }
              : a
          ),
        };
      });
      toast.success(`Inscripción confirmada: ${pending.student.firstName} ${pending.student.lastName}`);
      setPending(null);
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
        <Spinner className="h-4 w-4" /> Cargando…
      </div>
    );
  }

  const activities = data?.activities ?? [];
  const students = data?.students ?? [];

  const query = search.trim().toLowerCase();
  const matches =
    query.length === 0
      ? []
      : students.filter((s) => `${s.firstName} ${s.lastName}`.toLowerCase().includes(query));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-semibold">Itinerancias</h1>
          <p className="text-sm text-muted-foreground">
            Buscá tu nombre y tocalo en la actividad a la que querés anotarte. La inscripción es
            definitiva: no se puede deshacer sola.
          </p>
        </div>

        <Input
          label="Buscar mi nombre"
          placeholder="Nombre o apellido…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        {activities.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Todavía no hay actividades publicadas.
          </p>
        ) : query.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Escribí tu nombre arriba para buscarte y anotarte a una actividad.
          </p>
        ) : matches.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No encontramos a nadie con ese nombre.
          </p>
        ) : (
          activities.map((activity) => (
            <Card key={activity.id} className="flex flex-col gap-4 p-4 sm:p-6">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold">{activity.title}</h2>
                  <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs">
                    {CATEGORY_LABELS[activity.category] ?? activity.category}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDateEs(activity.date)} · {formatTimeRange(activity.startTime, activity.endTime)}
                </p>
                {activity.description && <p className="mt-1 text-sm">{activity.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {matches.map((student) => {
                  const registered = activity.registeredStudentIds.includes(student.id);
                  return (
                    <StudentCard
                      key={student.id}
                      firstName={student.firstName}
                      lastName={student.lastName}
                      photoUrl={student.photoUrl}
                      present={registered}
                      disabled={registered}
                      onClick={() => setPending({ activity, student })}
                    />
                  );
                })}
              </div>
            </Card>
          ))
        )}

      <ConfirmDialog
        open={pending !== null}
        title="Confirmar inscripción"
        message={
          pending
            ? `¿Confirmás la inscripción de ${pending.student.firstName} ${pending.student.lastName} a "${pending.activity.title}"? No se puede deshacer.`
            : ""
        }
        confirmLabel="Confirmar"
        loading={confirming}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
