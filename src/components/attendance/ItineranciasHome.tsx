"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ItineranciasClient } from "@/components/attendance/ItineranciasClient";
import { ItineranciaAttendanceClient } from "@/components/attendance/ItineranciaAttendanceClient";

type Section = "inscripcion" | "asistencia";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "inscripcion", label: "Inscripción" },
  { id: "asistencia", label: "Asistencia" },
];

export function ItineranciasHome({ adminId }: { adminId: string }) {
  const [section, setSection] = useState<Section>("inscripcion");

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <div className="mx-auto flex w-full max-w-5xl gap-1 px-4 pt-4 sm:px-6">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              section === s.id ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-surface-2"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "inscripcion" ? (
        <ItineranciasClient adminId={adminId} />
      ) : (
        <ItineranciaAttendanceClient adminId={adminId} />
      )}
    </div>
  );
}
