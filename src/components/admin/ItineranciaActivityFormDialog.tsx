"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ItineranciaActivityListItem, ItineranciaCategory, ItineranciaLocation } from "@/types";

const CATEGORY_OPTIONS: { value: ItineranciaCategory; label: string }[] = [
  { value: "EVALUACION", label: "Evaluación" },
  { value: "SEMINARIO", label: "Seminario" },
  { value: "CURSO", label: "Curso" },
  { value: "COMPENSATORIOS", label: "Compensatorios" },
  { value: "CLASES_ESPECIALES", label: "Clases Especiales" },
];

const LOCATION_OPTIONS: { value: ItineranciaLocation; label: string }[] = [
  { value: "CORDOBA", label: "Córdoba" },
  { value: "ALTA_GRACIA", label: "Alta Gracia" },
];

type ItineranciaActivityFormDialogProps = {
  open: boolean;
  activity: ItineranciaActivityListItem | null;
  onClose: () => void;
  onSaved: () => void;
};

export function ItineranciaActivityFormDialog({
  open,
  activity,
  onClose,
  onSaved,
}: ItineranciaActivityFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ItineranciaCategory>("EVALUACION");
  const [location, setLocation] = useState<ItineranciaLocation>("CORDOBA");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(activity?.title ?? "");
      setDescription(activity?.description ?? "");
      setCategory(activity?.category ?? "EVALUACION");
      setLocation(activity?.location ?? "CORDOBA");
      setDate(activity?.date ?? "");
      setStartTime(activity?.startTime ?? "09:00");
      setEndTime(activity?.endTime ?? "10:00");
      setError(null);
    }
  }, [open, activity]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        activity ? `/api/itinerancias/activities/${activity.id}` : "/api/itinerancias/activities",
        {
          method: activity ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description: description || null,
            category,
            location,
            date,
            startTime,
            endTime,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar la actividad");
        return;
      }
      toast.success(activity ? "Actividad actualizada" : "Actividad creada");
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
        <h2 className="text-lg font-semibold">{activity ? "Editar actividad" : "Nueva actividad"}</h2>

        <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />

        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Categoría</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ItineranciaCategory)}
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Sede</span>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value as ItineranciaLocation)}
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm"
          >
            {LOCATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Descripción (opcional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>

        <Input type="date" label="Fecha" value={date} onChange={(e) => setDate(e.target.value)} required />

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="time"
            label="Hora de inicio"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
          <Input
            type="time"
            label="Hora de fin"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
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
