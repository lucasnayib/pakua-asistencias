"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DAY_NAMES } from "@/lib/time";
import type { ScheduleListItem } from "@/types";

// Igual a la duración de modal-out en globals.css.
const CLOSE_ANIMATION_MS = 140;

type ScheduleFormDialogProps = {
  open: boolean;
  schedule: ScheduleListItem | null;
  onClose: () => void;
  onSaved: () => void;
};

export function ScheduleFormDialog({ open, schedule, onClose, onSaved }: ScheduleFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:00");
  const [days, setDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setName(schedule?.name ?? "");
      setStartTime(schedule?.startTime ?? "18:00");
      setEndTime(schedule?.endTime ?? "19:00");
      setDays(schedule?.days.map((d) => d.dayOfWeek) ?? []);
      setErrors([]);
    }
  }, [open, schedule]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.classList.remove("modal-exit");
      if (!dialog.open) dialog.showModal();
      return;
    }
    if (!dialog.open) return;
    dialog.classList.add("modal-exit");
    const timer = setTimeout(() => {
      dialog.close();
      dialog.classList.remove("modal-exit");
    }, CLOSE_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [open]);

  function toggleDay(day: number) {
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort()));
  }

  // Se valida todo junto en el cliente antes de mandar nada al servidor (que solo devuelve el
  // primer error que encuentra) para que el usuario vea de una todo lo que falta corregir, en
  // vez de ir descubriendo un error, corregirlo, mandar de nuevo y recién ahí ver el siguiente.
  function clientErrors(): string[] {
    const issues: string[] = [];
    if (days.length === 0) issues.push("Elegí al menos un día");
    if (endTime <= startTime) issues.push("La hora de fin debe ser posterior a la hora de inicio");
    return issues;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validation = clientErrors();
    if (validation.length > 0) {
      setErrors(validation);
      return;
    }
    setSaving(true);
    setErrors([]);
    try {
      const res = await fetch(schedule ? `/api/schedules/${schedule.id}` : "/api/schedules", {
        method: schedule ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || null, startTime, endTime, days }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors([data.error ?? "No se pudo guardar el horario"]);
        return;
      }
      toast.success(schedule ? "Horario actualizado" : "Horario creado");
      onSaved();
    } catch {
      setErrors(["Error de conexión"]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="modal-dialog m-auto w-[min(90vw,28rem)] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <h2 className="text-lg font-semibold">{schedule ? "Editar horario" : "Nuevo horario"}</h2>

        <Input
          label="Nombre (opcional)"
          placeholder="Ej: Kids, Avanzados…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input type="time" label="Hora de inicio" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          <Input type="time" label="Hora de fin" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
        </div>

        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Días de la semana</span>
          <div className="flex flex-wrap gap-2">
            {DAY_NAMES.map((label, index) => (
              <button
                type="button"
                key={label}
                onClick={() => toggleDay(index)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  days.includes(index)
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-surface hover:bg-surface-2"
                }`}
              >
                {label.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {errors.length > 0 && (
          <ul className="flex flex-col gap-1">
            {errors.map((e) => (
              <li key={e} className="text-sm text-danger">
                {e}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Guardar
          </Button>
        </div>
      </form>
    </dialog>
  );
}
