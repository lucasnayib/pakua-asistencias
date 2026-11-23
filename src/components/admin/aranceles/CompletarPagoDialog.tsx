"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatMoney } from "@/lib/aranceles-calc";

type CompletarPagoDialogProps = {
  open: boolean;
  concepto?: string;
  /** Lo ya pagado hasta ahora (el pago parcial registrado). */
  amount?: number;
  porcentajePagado?: number | null;
  onClose: () => void;
  onSaved: () => void;
  onSubmit: (montoAdicional: number) => Promise<{ ok: boolean; error?: string }>;
};

// Marca un pago parcial de cuota como completado: el admin carga cuánto pagó el alumno ahora
// del resto, que se suma a lo ya registrado — no reemplaza el monto, lo acumula (ver
// PagoArancel.amount en el schema: siempre es la plata efectivamente cobrada hasta el momento).
export function CompletarPagoDialog({
  open,
  concepto,
  amount,
  porcentajePagado,
  onClose,
  onSaved,
  onSubmit,
}: CompletarPagoDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [montoAdicional, setMontoAdicional] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMontoAdicional("");
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const extra = Math.round(Number(montoAdicional));
  const valido = Number.isFinite(extra) && extra > 0;
  const totalFinal = valido && amount != null ? amount + extra : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido) {
      setError("Completá un monto válido");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await onSubmit(extra);
      if (!result.ok) {
        setError(result.error ?? "No se pudo guardar");
        return;
      }
      toast.success("Pago marcado como completado");
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
          <h2 className="text-lg font-semibold">Completar pago</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {concepto ? `De "${concepto}"` : "De esta cuota"}
            {porcentajePagado != null && ` ya se pagó un ${porcentajePagado}%`}
            {amount != null && ` (${formatMoney(amount)})`}. Cargá cuánto pagó el alumno ahora del resto —
            se suma a lo ya registrado y la cuota queda marcada como completada.
          </p>
        </div>
        <Input
          label="Monto recibido ahora"
          type="number"
          min={1}
          step={1}
          autoFocus
          value={montoAdicional}
          onChange={(e) => setMontoAdicional(e.target.value)}
          required
        />
        {totalFinal !== null && (
          <p className="text-sm text-muted-foreground">
            Total pagado: <span className="font-medium text-success">{formatMoney(totalFinal)}</span>
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
