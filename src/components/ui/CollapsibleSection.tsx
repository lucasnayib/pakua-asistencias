"use client";

import { useState } from "react";
import { SidebarIcon } from "@/components/admin/SidebarIcon";

/** Sección plegable animada, mismo truco de "grid-template-rows" que ya usa AdminSidebar para
 * sus grupos colapsables — <details> nativo no se puede animar suave sin JS, así que esto es
 * un acordeón controlado en vez de eso. */
export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 p-4 text-left transition hover:bg-surface-2"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{title}</span>
          {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
        </span>
        <SidebarIcon
          name={open ? "chevron-up" : "chevron-down"}
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200"
        />
      </button>
      {/* El contenido se abre con un pequeño delay (solo al desplegar, no al cerrar) para que
          se sienta más intencional en vez de un salto instantáneo. */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? "delay-75 grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden" inert={!open}>
          <div className="border-t border-border p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
