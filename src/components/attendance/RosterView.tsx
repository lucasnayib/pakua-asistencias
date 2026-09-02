"use client";

import { useState } from "react";
import { toast } from "sonner";
import { StudentCard } from "@/components/students/StudentCard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getLocalNow } from "@/lib/time";
import type { RosterStudent } from "@/types";

type RosterViewProps = {
  scheduleId: string;
  date: string;
  initialRoster: RosterStudent[];
  requiresLocation: boolean;
};

/** Envuelve navigator.geolocation en una promesa, con mensajes de error entendibles. */
function getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Este navegador no soporta geolocalización"));
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      reject(new Error("La ubicación solo funciona por HTTPS o en localhost"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("Necesitás dar permiso de ubicación para marcar asistencia"));
        } else {
          reject(new Error("No se pudo obtener tu ubicación"));
        }
      },
      { enableHighAccuracy: true, timeout: 15_000 }
    );
  });
}

export function RosterView({ scheduleId, date, initialRoster, requiresLocation }: RosterViewProps) {
  const [roster, setRoster] = useState(initialRoster);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<RosterStudent | null>(null);
  const [removing, setRemoving] = useState(false);

  async function markPresent(student: RosterStudent) {
    setPendingId(student.id);
    try {
      let location: { latitude: number; longitude: number } | null = null;
      if (requiresLocation) {
        try {
          location = await getCurrentLocation();
        } catch (locationError) {
          toast.error(locationError instanceof Error ? locationError.message : "No se pudo obtener tu ubicación");
          return;
        }
      }
      const { time } = getLocalNow();
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          scheduleId,
          date,
          time,
          ...(location ? { latitude: location.latitude, longitude: location.longitude } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo registrar la asistencia");
        return;
      }
      setRoster((current) =>
        current.map((s) =>
          s.id === student.id
            ? { ...s, present: true, attendanceId: data.attendance.id, time: data.attendance.time }
            : s
        )
      );
      toast.success(`Asistencia registrada: ${student.firstName} ${student.lastName}`);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setPendingId(null);
    }
  }

  async function unmarkPresent() {
    if (!confirmTarget?.attendanceId) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/attendance/${confirmTarget.attendanceId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo quitar la asistencia");
        return;
      }
      setRoster((current) =>
        current.map((s) =>
          s.id === confirmTarget.id ? { ...s, present: false, attendanceId: null, time: null } : s
        )
      );
      toast.success(`Asistencia quitada: ${confirmTarget.firstName} ${confirmTarget.lastName}`);
      setConfirmTarget(null);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setRemoving(false);
    }
  }

  function handleCardClick(student: RosterStudent) {
    if (student.present) {
      setConfirmTarget(student);
    } else {
      markPresent(student);
    }
  }

  if (roster.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Todavía no hay alumnos asignados a este horario.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {roster.map((student) => (
          <StudentCard
            key={student.id}
            firstName={student.firstName}
            lastName={student.lastName}
            photoUrl={student.photoUrl}
            present={student.present}
            disabled={pendingId === student.id}
            onClick={() => handleCardClick(student)}
          />
        ))}
      </div>

      <ConfirmDialog
        open={confirmTarget !== null}
        title="Quitar asistencia"
        message={
          confirmTarget
            ? `¿Querés quitar la asistencia registrada a ${confirmTarget.firstName} ${confirmTarget.lastName}?`
            : ""
        }
        confirmLabel="Quitar"
        danger
        loading={removing}
        onConfirm={unmarkPresent}
        onCancel={() => setConfirmTarget(null)}
      />
    </>
  );
}
