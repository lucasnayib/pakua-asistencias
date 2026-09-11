import { dayName, dayOfWeekFromISODate, formatDateEs, formatTimeRange } from "@/lib/time";
import type { ItineranciaActivityListItem } from "@/types";

// Cubre el día completo: muchas actividades de Itinerancias caen de madrugada o pasada la
// medianoche (00hs-01hs, 22hs-23hs, etc.), y con un rango recortado (p. ej. 8 a 22) esas horas
// quedaban recortadas contra el borde y se veían amontonadas/superpuestas aunque no lo estuvieran.
const START_HOUR = 0;
const END_HOUR = 24;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
const HOUR_HEIGHT = 44; // px
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

const CATEGORY_LABELS: Record<string, string> = {
  EVALUACION: "Evaluación",
  SEMINARIO: "Seminario",
  CURSO: "Curso",
  OTRO: "Otro",
};

function minutesFromStart(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m - START_HOUR * 60;
}

function clampMinutes(value: number): number {
  return Math.min(Math.max(value, 0), TOTAL_MINUTES);
}

type Block = {
  activity: ItineranciaActivityListItem;
  top: number;
  height: number;
  lane: number;
  lanes: number;
};

/** Asigna cada actividad a un "carril" para que las que se superponen en la misma fecha se muestren una al lado de la otra. */
function layoutDate(activities: ItineranciaActivityListItem[]): Block[] {
  const sorted = [...activities].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const laneEndMinute: number[] = [];
  const raw = sorted.map((activity) => {
    const start = clampMinutes(minutesFromStart(activity.startTime));
    const rawEnd = minutesFromStart(activity.endTime);
    // "00:00" como hora de fin (o cualquier fin <= inicio) significa medianoche, es decir, el
    // final del día en curso — no una hora "negativa" del día siguiente.
    const end = clampMinutes(rawEnd <= start ? TOTAL_MINUTES : rawEnd);
    let lane = laneEndMinute.findIndex((endMinute) => endMinute <= start);
    if (lane === -1) {
      lane = laneEndMinute.length;
      laneEndMinute.push(end);
    } else {
      laneEndMinute[lane] = end;
    }
    return { activity, start, end, lane };
  });

  const lanes = Math.max(1, laneEndMinute.length);
  return raw.map(({ activity, start, end, lane }) => ({
    activity,
    top: (start / TOTAL_MINUTES) * TOTAL_HEIGHT,
    height: Math.max(((end - start) / TOTAL_MINUTES) * TOTAL_HEIGHT, 26),
    lane,
    lanes,
  }));
}

type ItineranciaCalendarViewProps = {
  activities: ItineranciaActivityListItem[];
  onEdit: (activity: ItineranciaActivityListItem) => void;
};

export function ItineranciaCalendarView({ activities, onEdit }: ItineranciaCalendarViewProps) {
  const dates = Array.from(new Set(activities.map((a) => a.date))).sort();

  if (dates.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Todavía no hay actividades con fecha para mostrar en el calendario.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <div className="grid min-w-[860px]" style={{ gridTemplateColumns: `3.5rem repeat(${dates.length}, 1fr)` }}>
        <div className="border-b border-border" />
        {dates.map((date) => (
          <div
            key={date}
            className="border-b border-l border-border bg-surface-2 p-2 text-center text-sm font-semibold"
          >
            <p>{dayName(dayOfWeekFromISODate(date))}</p>
            <p className="text-xs font-normal text-muted-foreground">{formatDateEs(date)}</p>
          </div>
        ))}

        <div className="relative" style={{ height: TOTAL_HEIGHT }}>
          {HOURS.map((hour, i) => (
            <span
              key={hour}
              className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground"
              style={{ top: i * HOUR_HEIGHT }}
            >
              {hour}:00
            </span>
          ))}
        </div>

        {dates.map((date) => {
          const dateActivities = activities.filter((a) => a.date === date);
          const blocks = layoutDate(dateActivities);
          return (
            <div key={date} className="relative border-l border-border" style={{ height: TOTAL_HEIGHT }}>
              {HOURS.map((hour, i) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-border/50"
                  style={{ top: i * HOUR_HEIGHT }}
                />
              ))}
              {blocks.map(({ activity, top, height, lane, lanes }) => (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => onEdit(activity)}
                  title="Editar actividad"
                  className="absolute overflow-hidden rounded-md border border-accent/60 bg-accent/15 p-1.5 text-left text-xs leading-tight transition hover:bg-accent/25 focus:outline-none focus:ring-2 focus:ring-accent/40"
                  style={{
                    top,
                    height,
                    left: `${(lane / lanes) * 100}%`,
                    width: `${100 / lanes}%`,
                  }}
                >
                  <p className="truncate font-semibold">{activity.title}</p>
                  <p className="truncate text-muted-foreground">
                    {CATEGORY_LABELS[activity.category] ?? activity.category} ·{" "}
                    {formatTimeRange(activity.startTime, activity.endTime)}
                  </p>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
