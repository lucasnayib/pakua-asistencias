"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DAY_NAMES } from "@/lib/time";
import type { ScheduleListItem } from "@/types";

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(schedule?.name ?? "");
      setStartTime(schedule?.startTime ?? "18:00");
      setEndTime(schedule?.endTime ?? "19:00");
      setDays(schedule?.days.map((d) => d.dayOfWeek) ?? []);
      setError(null);
    }
  }, [open, schedule]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function toggleDay(day: number) {
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort()));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(schedule ? `/api/schedules/${schedule.id}` : "/api/schedules", {
        method: schedule ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || null, startTime, endTime, days }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar el horario");
        return;
      }
      toast.success(schedule ? "Horario actualizado" : "Horario creado");
      onSaved();
    } catch {
      setError("Error de conexión");
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
      className="m-auto w-[min(90vw,28rem)] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
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

        {error && <p className="text-sm text-danger">{error}</p>}

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
