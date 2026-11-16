import { SidebarIcon, SidebarIconName } from "@/components/admin/SidebarIcon";

/** Recreación estática del panel real (mismos tokens de color, misma iconografía de
 * src/components/admin/SidebarIcon.tsx, mismas etiquetas que usa el dashboard real) para el
 * hero de la landing — en vez de una ilustración genérica de artes marciales. No es
 * interactiva ni muestra datos reales: son valores de ejemplo, marcados como tales, para
 * transmitir qué aspecto tiene el software sin inventar métricas de ninguna escuela real. */

const RAIL_ICONS: SidebarIconName[] = ["dashboard", "users", "clock", "wallet"];

const STATS: { label: string; value: string; icon: SidebarIconName }[] = [
  { label: "Alumnos activos", value: "128", icon: "users" },
  { label: "Asistencias registradas hoy", value: "34", icon: "clipboard-check" },
];

const SCHEDULE = [
  { time: "09:00", name: "Clase de la mañana" },
  { time: "18:30", name: "Clase de la tarde" },
  { time: "20:00", name: "Clase nocturna" },
];

export function DashboardPreview() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-drawer">
      {/* Barra tipo ventana/navegador: deja clarísimo que esto es "software", no una foto. */}
      <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
        <span className="ml-2 truncate text-xs font-medium text-muted-foreground">
          Panel de Pakua Asistencias
        </span>
        <span className="ml-auto shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
          Vista de ejemplo
        </span>
      </div>

      <div className="flex">
        {/* Rail angosto, igual criterio visual que la barra lateral contraída real. */}
        <div className="hidden flex-col items-center gap-3 border-r border-border bg-surface-2 px-3 py-4 sm:flex">
          {RAIL_ICONS.map((icon, i) => (
            <span
              key={icon}
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                i === 0 ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              }`}
            >
              <SidebarIcon name={icon} className="h-4 w-4" />
            </span>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3">
            {STATS.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <SidebarIcon name={stat.icon} className="h-3.5 w-3.5" />
                  <span className="truncate text-[11px] font-medium">{stat.label}</span>
                </div>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-background p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Clases de hoy
            </p>
            <ul className="flex flex-col divide-y divide-border">
              {SCHEDULE.map((item) => (
                <li key={item.time} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="font-medium">{item.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{item.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
