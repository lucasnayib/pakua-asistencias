"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StudentCard } from "@/components/students/StudentCard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { formatTimeRange, getLocalNow } from "@/lib/time";
import { getCurrentLocation } from "@/lib/geolocation-client";
import type { ItineranciaAttendanceActivity, ItineranciaAttendanceResponse, ItineranciaAttendanceStudent } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  EVALUACION: "Evaluación",
  SEMINARIO: "Seminario",
  CURSO: "Curso",
  COMPENSATORIOS: "Compensatorios",
  CLASES_ESPECIALES: "Clases Especiales",
};

const LOCATION_LABELS: Record<string, string> = {
  CORDOBA: "Córdoba",
  ALTA_GRACIA: "Alta Gracia",
};

type ItineranciaAttendanceClientProps = {
  adminId: string;
};

type PendingUnmark = {
  activity: ItineranciaAttendanceActivity;
  student: ItineranciaAttendanceStudent;
};

export function ItineranciaAttendanceClient({ adminId }: ItineranciaAttendanceClientProps) {
  // Se calcula en el dispositivo del alumno, no en el servidor: si se calculara en el server, el
  // resultado dependería de su zona horaria (UTC en producción) y no de la del alumno, mostrando
  // "las clases de mañana" cerca de la medianoche. Mismo criterio que ya usa "Clases anteriores"
  // para la asistencia normal.
  const todayIso = getLocalNow().date;
  const [date, setDate] = useState(todayIso);
  const [data, setData] = useState<ItineranciaAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [unmarkTarget, setUnmarkTarget] = useState<PendingUnmark | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/itinerancias/attendance?adminId=${adminId}&date=${date}`, { cache: "no-store" })
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [adminId, date]);

  async function markPresent(activity: ItineranciaAttendanceActivity, student: ItineranciaAttendanceStudent) {
    setPendingId(student.id);
    try {
      // Solo hace falta ubicación al marcar presente EN EL MOMENTO (viendo el día de hoy); para
      // una corrección de un día anterior el servidor ni la exige, así que no tiene sentido
      // pedirla acá.
      let location: { latitude: number; longitude: number } | null = null;
      if (activity.requiresLocation && date === todayIso) {
        try {
          location = await getCurrentLocation();
        } catch (locationError) {
          toast.error(locationError instanceof Error ? locationError.message : "No se pudo obtener tu ubicación");
          return;
        }
      }
      const res = await fetch("/api/itinerancias/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: activity.id,
          studentId: student.id,
          clientDate: getLocalNow().date,
          ...(location ? { latitude: location.latitude, longitude: location.longitude } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? "No se pudo registrar la asistencia");
        return;
      }
      setData((current) => {
        if (!current) return current;
        return {
          activities: current.activities.map((a) =>
            a.id === activity.id
              ? { ...a, students: a.students.map((s) => (s.id === student.id ? { ...s, attended: true } : s)) }
              : a
          ),
        };
      });
      toast.success(`Asistencia registrada: ${student.firstName} ${student.lastName}`);
    } finally {
      setPendingId(null);
    }
  }

  async function unmarkPresent() {
    if (!unmarkTarget) return;
    setRemoving(true);
    try {
      const res = await fetch("/api/itinerancias/attendance", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: unmarkTarget.activity.id,
          studentId: unmarkTarget.student.id,
          clientDate: getLocalNow().date,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? "No se pudo quitar la asistencia");
        return;
      }
      setData((current) => {
        if (!current) return current;
        return {
          activities: current.activities.map((a) =>
            a.id === unmarkTarget.activity.id
              ? {
                  ...a,
                  students: a.students.map((s) => (s.id === unmarkTarget.student.id ? { ...s, attended: false } : s)),
                }
              : a
          ),
        };
      });
      toast.success(`Asistencia quitada: ${unmarkTarget.student.firstName} ${unmarkTarget.student.lastName}`);
      setUnmarkTarget(null);
    } finally {
      setRemoving(false);
    }
  }

  function handleCardClick(activity: ItineranciaAttendanceActivity, student: ItineranciaAttendanceStudent) {
    if (student.attended) {
      setUnmarkTarget({ activity, student });
    } else {
      markPresent(activity, student);
    }
  }

  const activities = data?.activities ?? [];
  const isToday = date === todayIso;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Asistencia — Itinerancias</h1>
        <p className="text-sm text-muted-foreground">
          Tocá tu nombre en la actividad para marcar tu asistencia. Si te olvidaste de marcarla
          un día anterior, elegí esa fecha abajo.
        </p>
      </div>

      <Input
        type="date"
        label="Fecha"
        value={date}
        max={todayIso}
        onChange={(e) => setDate(e.target.value)}
        className="w-auto"
      />

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" /> Cargando…
        </div>
      ) : activities.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {isToday ? "No hay actividades de Itinerancias hoy." : "No hubo actividades de Itinerancias ese día."}
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
                {formatTimeRange(activity.startTime, activity.endTime)}
                {activity.location && <> · {LOCATION_LABELS[activity.location] ?? activity.location}</>}
              </p>
            </div>

            {activity.students.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no hay alumnos inscriptos a esta actividad.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {activity.students.map((student) => (
                  <StudentCard
                    key={student.id}
                    firstName={student.firstName}
                    lastName={student.lastName}
                    photoUrl={student.photoUrl}
                    present={student.attended}
                    disabled={pendingId === student.id}
                    onClick={() => handleCardClick(activity, student)}
                  />
                ))}
              </div>
            )}
          </Card>
        ))
      )}

      <ConfirmDialog
        open={unmarkTarget !== null}
        title="Quitar asistencia"
        message={
          unmarkTarget
            ? `¿Querés quitar la asistencia registrada a ${unmarkTarget.student.firstName} ${unmarkTarget.student.lastName}?`
            : ""
        }
        confirmLabel="Quitar"
        danger
        loading={removing}
        onConfirm={unmarkPresent}
        onCancel={() => setUnmarkTarget(null)}
      />
    </div>
  );
}
