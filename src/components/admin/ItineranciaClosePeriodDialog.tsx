"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatItineranciaPeriodLabel } from "@/lib/itinerancia-period";

type ItineranciaClosePeriodDialogProps = {
  open: boolean;
  activeCount: number;
  onClose: () => void;
  onClosed: () => void;
};

export function ItineranciaClosePeriodDialog({
  open,
  activeCount,
  onClose,
  onClosed,
}: ItineranciaClosePeriodDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [label, setLabel] = useState("");
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
      setLabel(formatItineranciaPeriodLabel(new Date()));
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/itinerancias/close-period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo cerrar el período");
        return;
      }
      toast.success(
        data.archivedCount > 0
          ? `Se archivaron ${data.archivedCount} actividad(es) en "${label}"`
          : "No había actividades activas para archivar"
      );
      onClosed();
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
      className="m-auto w-[min(90vw,28rem)] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <h2 className="text-lg font-semibold">Cerrar itinerancia actual</h2>
        <p className="text-sm text-muted-foreground">
          {activeCount > 0
            ? `Se van a archivar ${activeCount} actividad(es) activas bajo este nombre. El panel principal va a quedar limpio para las próximas actividades.`
            : "No hay actividades activas para archivar en este momento."}
        </p>
        {activeCount > 0 && (
          <p className="text-xs text-danger">Esta acción no se puede deshacer fácilmente.</p>
        )}
        <Input
          label="Nombre del período"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Cerrar período
          </Button>
        </div>
      </form>
    </dialog>
  );
}
