import { formatTimeRange } from "@/lib/time";
import type { ScheduleListItem } from "@/types";

const CALENDAR_DAYS = [1, 2, 3, 4, 5, 6] as const; // lunes a sábado (Date.getDay())
const DAY_LABELS: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

const START_HOUR = 9;
const END_HOUR = 22;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
const HOUR_HEIGHT = 56; // px
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

function minutesFromStart(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m - START_HOUR * 60;
}

function clampMinutes(value: number): number {
  return Math.min(Math.max(value, 0), TOTAL_MINUTES);
}

type Block = {
  schedule: ScheduleListItem;
  top: number;
  height: number;
  lane: number;
  lanes: number;
};

/** Asigna cada horario a un "carril" para que los que se superponen en el mismo día se muestren uno al lado del otro. */
function layoutDay(schedules: ScheduleListItem[]): Block[] {
  const sorted = [...schedules].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const laneEndMinute: number[] = [];
  const raw = sorted.map((schedule) => {
    const start = clampMinutes(minutesFromStart(schedule.startTime));
    const end = clampMinutes(minutesFromStart(schedule.endTime));
    let lane = laneEndMinute.findIndex((endMinute) => endMinute <= start);
    if (lane === -1) {
      lane = laneEndMinute.length;
      laneEndMinute.push(end);
    } else {
      laneEndMinute[lane] = end;
    }
    return { schedule, start, end, lane };
  });

  const lanes = Math.max(1, laneEndMinute.length);
  return raw.map(({ schedule, start, end, lane }) => ({
    schedule,
    top: (start / TOTAL_MINUTES) * TOTAL_HEIGHT,
    height: Math.max(((end - start) / TOTAL_MINUTES) * TOTAL_HEIGHT, 26),
    lane,
    lanes,
  }));
}

type ScheduleCalendarViewProps = {
  schedules: ScheduleListItem[];
  onEdit: (schedule: ScheduleListItem) => void;
};

export function ScheduleCalendarView({ schedules, onEdit }: ScheduleCalendarViewProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <div className="grid min-w-[860px] grid-cols-[3.5rem_repeat(6,1fr)]">
        <div className="border-b border-border" />
        {CALENDAR_DAYS.map((day) => (
          <div
            key={day}
            className="border-b border-l border-border bg-surface-2 p-2 text-center text-sm font-semibold"
          >
            {DAY_LABELS[day]}
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

        {CALENDAR_DAYS.map((day) => {
          const daySchedules = schedules.filter((s) => s.days.some((d) => d.dayOfWeek === day));
          const blocks = layoutDay(daySchedules);
          return (
            <div key={day} className="relative border-l border-border" style={{ height: TOTAL_HEIGHT }}>
              {HOURS.map((hour, i) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-border/50"
                  style={{ top: i * HOUR_HEIGHT }}
                />
              ))}
              {blocks.map(({ schedule, top, height, lane, lanes }) => (
                <button
                  key={schedule.id}
                  type="button"
                  onClick={() => onEdit(schedule)}
                  title="Editar horario"
                  className="absolute overflow-hidden rounded-md border border-accent/60 bg-accent/15 p-1.5 text-left text-xs leading-tight transition hover:bg-accent/25 focus:outline-none focus:ring-2 focus:ring-accent/40"
                  style={{
                    top,
                    height,
                    left: `${(lane / lanes) * 100}%`,
                    width: `${100 / lanes}%`,
                  }}
                >
                  <p className="truncate font-semibold">
                    {schedule.name || formatTimeRange(schedule.startTime, schedule.endTime)}
                  </p>
                  <p className="truncate text-muted-foreground">
                    {formatTimeRange(schedule.startTime, schedule.endTime)}
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
