"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { SidebarIcon } from "@/components/admin/SidebarIcon";

// Igual a la duración de overflow-menu-out en globals.css — mismo patrón de popover que
// OverflowMenu (abre/cierra con un pequeño delay de salida para que la animación se note).
const CLOSE_ANIMATION_MS = 140;

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

type DatePickerProps = {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  label?: string;
  // "YYYY-MM-DD": mismo significado que el atributo max/min de <input type="date">.
  max?: string;
  min?: string;
  className?: string;
};

// Reemplazo táctil del <input type="date"> nativo: en varias tablets (sobre todo Android con
// teclados/navegadores no-Chrome) el selector nativo no abre al tocar, o abre pero no deja
// confirmar — ver ClasesAnterioresClient. Este es un calendario propio, mismo patrón de popover
// con click-afuera-para-cerrar que ya usa OverflowMenu, con botones de día de 36px (sobra para
// un dedo) en vez de depender del picker del sistema operativo.
export function DatePicker({ value, onChange, label, max, min, className = "" }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(value ? parseISO(value) : new Date()));
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
    setViewMonth(startOfMonth(value ? parseISO(value) : new Date()));
    setOpen(true);
  }

  const days = useMemo(() => {
    const gridStart = startOfWeek(viewMonth, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewMonth]);

  const nextMonthIso = format(startOfMonth(addMonths(viewMonth, 1)), "yyyy-MM");
  const prevMonthIso = format(startOfMonth(addMonths(viewMonth, -1)), "yyyy-MM");
  const nextDisabled = Boolean(max) && nextMonthIso > max!.slice(0, 7);
  const prevDisabled = Boolean(min) && prevMonthIso < min!.slice(0, 7);

  const selectedDate = value ? parseISO(value) : null;
  const displayLabel = selectedDate ? format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: es }) : "Elegí una fecha";

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
          aria-label="Elegir fecha"
          className={`absolute left-0 top-full z-20 mt-1 w-72 rounded-xl border border-border bg-surface p-3 shadow-key ${
            closing ? "overflow-menu-closing" : "overflow-menu-open"
          }`}
        >
          <div className="flex items-center justify-between pb-2">
            <button
              type="button"
              aria-label="Mes anterior"
              disabled={prevDisabled}
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-30"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="text-sm font-semibold capitalize">{format(viewMonth, "MMMM yyyy", { locale: es })}</span>
            <button
              type="button"
              aria-label="Mes siguiente"
              disabled={nextDisabled}
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-30"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
            {WEEKDAY_LABELS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const iso = format(day, "yyyy-MM-dd");
              const disabled = (Boolean(max) && iso > max!) || (Boolean(min) && iso < min!);
              const selected = selectedDate !== null && isSameDay(day, selectedDate);
              const outside = !isSameMonth(day, viewMonth);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(iso);
                    requestClose();
                  }}
                  className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition disabled:pointer-events-none disabled:opacity-30 ${
                    selected
                      ? "bg-accent font-semibold text-accent-foreground"
                      : outside
                        ? "text-muted-foreground/60 hover:bg-surface-2"
                        : "text-foreground hover:bg-surface-2"
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
