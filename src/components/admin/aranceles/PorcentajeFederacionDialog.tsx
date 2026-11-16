"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatMoney } from "@/lib/aranceles-calc";

type PorcentajeFederacionDialogProps = {
  open: boolean;
  concepto?: string;
  amount?: number;
  /** % ya cargado, si lo hay — para poder corregirlo, no solo cargarlo por primera vez. */
  currentPorcentaje?: number | null;
  onClose: () => void;
  onSaved: () => void;
  onSubmit: (porcentaje: number) => Promise<{ ok: boolean; error?: string }>;
};

// Carga (o corrige) el % que le queda a la escuela en un pago/movimiento de categoría
// FEDERACION — tanto para pagos nuevos como para cargarlo retroactivamente en uno viejo (ver
// AskUserQuestion: el porcentaje no es fijo, depende de la actividad y cambia con el tiempo).
export function PorcentajeFederacionDialog({
  open,
  concepto,
  amount,
  currentPorcentaje,
  onClose,
  onSaved,
  onSubmit,
}: PorcentajeFederacionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [porcentaje, setPorcentaje] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPorcentaje(currentPorcentaje != null ? String(currentPorcentaje) : "");
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const pct = Number(porcentaje);
  const valido = Number.isFinite(pct) && pct >= 0 && pct <= 100;
  const montoEscuela = valido && amount != null ? Math.round((amount * pct) / 100) : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido) {
      setError("El porcentaje tiene que estar entre 0 y 100");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await onSubmit(pct);
      if (!result.ok) {
        setError(result.error ?? "No se pudo guardar");
        return;
      }
      toast.success("Porcentaje guardado");
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">% para la escuela</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {concepto ? `De "${concepto}"` : "De este pago"}, qué porcentaje le queda a la escuela — el
            resto se cuenta como dinero que se le pasa a la federación.
          </p>
        </div>
        <Input
          label="Porcentaje"
          type="number"
          min={0}
          max={100}
          step={1}
          autoFocus
          value={porcentaje}
          onChange={(e) => setPorcentaje(e.target.value)}
          required
        />
        {montoEscuela !== null && amount != null && (
          <p className="text-sm text-muted-foreground">
            Le queda a la escuela: <span className="font-medium text-success">{formatMoney(montoEscuela)}</span> de{" "}
            {formatMoney(amount)}
          </p>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" loading={busy}>
            Guardar
          </Button>
        </div>
      </form>
    </dialog>
  );
}
