"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SidebarIcon } from "@/components/admin/SidebarIcon";

// Igual a la duración de overflow-menu-out en globals.css — mismo patrón de popover que
// DatePicker/OverflowMenu.
const CLOSE_ANIMATION_MS = 140;

const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

type MonthPickerProps = {
  value: string; // "YYYY-MM"
  onChange: (value: string) => void;
  label?: string;
  // "YYYY-MM": mismo significado que max/min de <input type="month">.
  max?: string;
  min?: string;
  className?: string;
  // Ver DatePicker.tsx — mismo criterio para no generar scroll horizontal en formularios angostos.
  align?: "left" | "right";
};

function parseValue(value: string): { year: number; month: number } {
  const [y, m] = value.split("-").map(Number);
  return { year: y, month: m - 1 };
}

// Reemplazo del <input type="month"> nativo: mismo problema que describe DatePicker.tsx (el
// selector del sistema no se comporta bien en varias tablets) y, además, en navegadores donde sí
// abre, muestra el mes larguísimo en el idioma del dispositivo ("diciembre de 2026") pisando el
// estilo del resto del panel. Acá se elige directo de una grilla de 12 meses, año por año.
export function MonthPicker({ value, onChange, label, max, min, className = "", align = "left" }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [viewYear, setViewYear] = useState(() => parseValue(value || new Date().toISOString().slice(0, 7)).year);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const requestClose = useCallback(() => {
    if (open) setClosing(true);
  }, [open]);

  useEffect(() => {
    if (!open || closing) return;
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) requestClose();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, closing, requestClose]);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, CLOSE_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  function openPicker() {
    setViewYear(parseValue(value || new Date().toISOString().slice(0, 7)).year);
    setOpen(true);
  }

  const selected = value ? parseValue(value) : null;
  const displayLabel = selected ? `${MONTH_LABELS[selected.month]} de ${selected.year}` : "Elegí un mes";

  const prevYearDisabled = Boolean(min) && viewYear - 1 < parseValue(min!).year;
  const nextYearDisabled = Boolean(max) && viewYear + 1 > parseValue(max!).year;

  return (
    <div ref={wrapperRef} className="relative flex flex-col gap-1.5 text-sm">
      {label && <span className="font-medium text-foreground">{label}</span>}
      <button
        type="button"
        onClick={() => (open ? requestClose() : openPicker())}
        className={`flex h-10 items-center justify-between gap-2 rounded-lg border border-border bg-surface-inset px-3 text-left text-foreground outline-none transition focus:ring-2 focus:ring-accent/40 ${className}`}
      >
        <span className="truncate">{displayLabel}</span>
        <SidebarIcon name="calendar" className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Elegir mes"
          className={`absolute top-full z-20 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-3 shadow-key ${
            align === "right" ? "right-0" : "left-0"
          } ${closing ? "overflow-menu-closing" : "overflow-menu-open"}`}
        >
          <div className="flex items-center justify-between pb-2">
            <button
              type="button"
              aria-label="Año anterior"
              disabled={prevYearDisabled}
              onClick={() => setViewYear((y) => y - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-30"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="text-sm font-semibold">{viewYear}</span>
            <button
              type="button"
              aria-label="Año siguiente"
              disabled={nextYearDisabled}
              onClick={() => setViewYear((y) => y + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-30"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {MONTH_LABELS.map((monthLabel, i) => {
              const iso = `${viewYear}-${String(i + 1).padStart(2, "0")}`;
              const disabled = (Boolean(max) && iso > max!) || (Boolean(min) && iso < min!);
              const isSelected = selected !== null && selected.year === viewYear && selected.month === i;
              return (
                <button
                  key={monthLabel}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(iso);
                    requestClose();
                  }}
                  className={`flex h-9 items-center justify-center rounded-md text-xs font-medium transition disabled:pointer-events-none disabled:opacity-30 ${
                    isSelected
                      ? "bg-accent font-semibold text-accent-foreground"
                      : "text-foreground hover:bg-surface-2"
                  }`}
                >
                  {monthLabel}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
