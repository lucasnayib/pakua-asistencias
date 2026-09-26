"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { formatDateEs, formatTimeRange } from "@/lib/time";
import type { ItineranciaActivityListItem } from "@/types";

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

type ItineranciaActivityListProps = {
  activities: ItineranciaActivityListItem[];
  onEdit: (activity: ItineranciaActivityListItem) => void;
  onOpenRegistrations: (activity: ItineranciaActivityListItem) => void;
  onDelete: (activity: ItineranciaActivityListItem) => void;
};

/**
 * Tarjetas + agrupado por título exacto, compartido entre el panel principal de Itinerancias y
 * "Itinerancias anteriores". El estado de expandido es interno (no una prop): la vista de
 * anteriores renderiza una instancia de esta lista por cada período archivado, y cada una
 * necesita su propio collapse sin pisar las claves de las demás.
 */
export function ItineranciaActivityList({
  activities,
  onEdit,
  onOpenRegistrations,
  onDelete,
}: ItineranciaActivityListProps) {
  const [expandedTitles, setExpandedTitles] = useState<Set<string>>(new Set());

  function toggleTitle(title: string) {
    setExpandedTitles((current) => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  function renderActivityCard(a: ItineranciaActivityListItem) {
    return (
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
        {a.location && <p className="text-xs text-muted-foreground">{LOCATION_LABELS[a.location] ?? a.location}</p>}
        <p className="text-xs text-muted-foreground">{a._count.studentRegistrations} alumno(s) anotados</p>
        <div className="mt-1 flex flex-wrap gap-2 text-xs">
          <button className="text-muted-foreground hover:underline" onClick={() => onEdit(a)}>
            Editar
          </button>
          <button className="text-muted-foreground hover:underline" onClick={() => onOpenRegistrations(a)}>
            Ver inscriptos
          </button>
          <a className="text-muted-foreground hover:underline" href={`/api/itinerancias/activities/${a.id}/registrations/export`}>
            Exportar
          </a>
          <a
            className="text-muted-foreground hover:underline"
            href={`/api/itinerancias/activities/${a.id}/registrations/export?format=planilla`}
          >
            Planilla (PDF)
          </a>
          <button className="text-danger hover:underline" onClick={() => onDelete(a)}>
            Eliminar
          </button>
        </div>
      </Card>
    );
  }

  // Junta en un mismo grupo las actividades que tienen EXACTAMENTE el mismo título (típicamente
  // el mismo curso dictado en Córdoba y en Alta Gracia — ver la inscripción "hermana" que ya
  // registra al alumno en todas las actividades con ese título), para no tener que buscar cada
  // una por separado en una lista larga.
  const groupedByTitle = new Map<string, ItineranciaActivityListItem[]>();
  for (const a of activities) {
    const group = groupedByTitle.get(a.title);
    if (group) group.push(a);
    else groupedByTitle.set(a.title, [a]);
  }
  const activityGroups = [...groupedByTitle.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="flex flex-col gap-3">
      {activityGroups.map(([title, group]) => {
        if (group.length === 1) return renderActivityCard(group[0]);

        const expanded = expandedTitles.has(title);
        const totalRegistrations = group.reduce((sum, a) => sum + a._count.studentRegistrations, 0);
        return (
          <div key={title} className="rounded-xl border border-border">
            <button
              type="button"
              onClick={() => toggleTitle(title)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
            >
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">
                  {group.length} actividades · {totalRegistrations} alumno(s) anotados en total
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{expanded ? "Ocultar ▲" : "Ver ▼"}</span>
            </button>
            {expanded && (
              <div className="grid grid-cols-1 gap-3 border-t border-border p-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((a) => renderActivityCard(a))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
