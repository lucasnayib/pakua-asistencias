"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/AppHeader";
import { StudentCard } from "@/components/students/StudentCard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Card } from "@/components/ui/Card";
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
  person: ItineranciaPerson;
  personType: "STUDENT" | "ORIENTADOR";
};

export function ItineranciasClient({ adminId }: ItineranciasClientProps) {
  const [data, setData] = useState<ItineranciaPublicResponse | null>(null);
  const [loading, setLoading] = useState(true);
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
        body: JSON.stringify({
          activityId: pending.activity.id,
          personType: pending.personType,
          personId: pending.person.id,
        }),
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
              ? {
                  ...a,
                  registeredStudentIds:
                    pending.personType === "STUDENT"
                      ? [...a.registeredStudentIds, pending.person.id]
                      : a.registeredStudentIds,
                  registeredOrientadorIds:
                    pending.personType === "ORIENTADOR"
                      ? [...a.registeredOrientadorIds, pending.person.id]
                      : a.registeredOrientadorIds,
                }
              : a
          ),
        };
      });
      toast.success(`Inscripción confirmada: ${pending.person.firstName} ${pending.person.lastName}`);
      setPending(null);
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <>
        <AppHeader />
        <main className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" /> Cargando…
        </main>
      </>
    );
  }

  const activities = data?.activities ?? [];
  const students = data?.students ?? [];
  const orientadores = data?.orientadores ?? [];

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-semibold">Itinerancias</h1>
          <p className="text-sm text-muted-foreground">
            Tocá tu nombre en la actividad a la que querés anotarte. La inscripción es
            definitiva: no se puede deshacer sola.
          </p>
        </div>

        {activities.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Todavía no hay actividades publicadas.
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
                {[
                  ...students.map((s) => ({ person: s, type: "STUDENT" as const })),
                  ...orientadores.map((o) => ({ person: o, type: "ORIENTADOR" as const })),
                ].map(({ person, type }) => {
                  const registeredIds =
                    type === "STUDENT" ? activity.registeredStudentIds : activity.registeredOrientadorIds;
                  const registered = registeredIds.includes(person.id);
                  return (
                    <StudentCard
                      key={`${type}-${person.id}`}
                      firstName={person.firstName}
                      lastName={person.lastName}
                      photoUrl={person.photoUrl}
                      present={registered}
                      disabled={registered}
                      onClick={() => setPending({ activity, person, personType: type })}
                    />
                  );
                })}
              </div>
            </Card>
          ))
        )}
      </main>

      <ConfirmDialog
        open={pending !== null}
        title="Confirmar inscripción"
        message={
          pending
            ? `¿Confirmás la inscripción de ${pending.person.firstName} ${pending.person.lastName} a "${pending.activity.title}"? No se puede deshacer.`
            : ""
        }
        confirmLabel="Confirmar"
        loading={confirming}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
