"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

type SolicitarBorradoDialogProps = {
  open: boolean;
  concepto?: string;
  onClose: () => void;
  onSent: () => void;
  /** POST /api/aranceles/movimientos/solicitudes con { id, reason } */
  onSubmit: (reason: string) => Promise<{ ok: boolean; error?: string }>;
};

// Reemplaza al borrado directo cuando el movimiento/pago ya tiene un recibo exportado: en vez
// de un ConfirmDialog, pide una razón y manda la solicitud al superadmin (ver
// reciboExportedAt/AdminRequest en el schema y /admin/solicitudes del lado del superadmin).
export function SolicitarBorradoDialog({ open, concepto, onClose, onSent, onSubmit }: SolicitarBorradoDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await onSubmit(reason.trim());
      if (!result.ok) {
        setError(result.error ?? "No se pudo enviar la solicitud");
        return;
      }
      toast.success("Solicitud enviada al superadmin");
      onSent();
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
      className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">Solicitar borrado</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {concepto ? `"${concepto}" ya` : "Este movimiento ya"} tiene un recibo exportado, así que no se
            puede borrar directamente. Contale al superadmin por qué hay que borrarlo — si lo aprueba, se
            borra solo, sin que tengas que volver a entrar acá.
          </p>
        </div>
        <Textarea
          label="Razón del borrado"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej: el alumno pagó dos veces por error"
          minLength={5}
          maxLength={500}
          required
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" loading={busy} disabled={reason.trim().length < 5}>
            Enviar solicitud
          </Button>
        </div>
      </form>
    </dialog>
  );
}
