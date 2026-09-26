"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { formatDateEs } from "@/lib/time";
import type { ItineranciaRegisteredStudent } from "@/types";

type ItineranciaGraduationDialogProps = {
  open: boolean;
  student: ItineranciaRegisteredStudent | null;
  evaluationDate: string;
  onClose: () => void;
  onSaved: (updated: {
    graduacion: string | null;
    formacion: string | null;
    graduacionDelivered: boolean;
    graduacionDeliveredAt: string | null;
  }) => void;
};

export function ItineranciaGraduationDialog({
  open,
  student,
  evaluationDate,
  onClose,
  onSaved,
}: ItineranciaGraduationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [graduacion, setGraduacion] = useState("");
  const [delivered, setDelivered] = useState(false);
  const [deliveredAt, setDeliveredAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open) {
      setGraduacion("");
      setDelivered(false);
      setDeliveredAt("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!student) return;
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("graduacion", graduacion);
      formData.set("evaluationDate", evaluationDate);
      formData.set("graduacionDelivered", String(delivered));
      formData.set("graduacionDeliveredAt", delivered ? deliveredAt : "");
      const res = await fetch(`/api/students/${student.id}`, { method: "PATCH", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar");
        return;
      }
      toast.success(`Nueva graduación registrada para ${student.firstName} ${student.lastName}`);
      onSaved({
        graduacion: data.student.graduacion,
        formacion: data.student.formacion,
        graduacionDelivered: data.student.graduacionDelivered,
        graduacionDeliveredAt: data.student.graduacionDeliveredAt,
      });
      onClose();
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
      className="m-auto w-[min(90vw,26rem)] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <h2 className="text-lg font-semibold">
          Nueva graduación — {student?.firstName} {student?.lastName}
        </h2>
        <p className="text-sm text-muted-foreground">
          Graduación actual: {student?.graduacion ?? "—"}
        </p>
        <Input
          label="Nueva graduación"
          placeholder='Ej: "Cinto Naranja"'
          value={graduacion}
          onChange={(e) => setGraduacion(e.target.value)}
          required
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          Se autoriza con fecha {evaluationDate ? formatDateEs(evaluationDate) : "—"} (la fecha de esta actividad).
        </p>
        <Switch checked={delivered} onChange={setDelivered} label="Entregado" />
        {delivered && (
          <Input
            label="¿Cuándo fue entregado?"
            type="date"
            value={deliveredAt}
            onChange={(e) => setDeliveredAt(e.target.value)}
            required
          />
        )}
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="mt-1 flex justify-end gap-2">
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
