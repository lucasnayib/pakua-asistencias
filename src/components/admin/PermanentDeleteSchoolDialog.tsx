"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { AdminListItem } from "@/types";

type PermanentDeleteSchoolDialogProps = {
  admin: AdminListItem | null;
  onClose: () => void;
  onDeleted: () => void;
};

export function PermanentDeleteSchoolDialog({ admin, onClose, onDeleted }: PermanentDeleteSchoolDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirmUsername, setConfirmUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = admin !== null;

  useEffect(() => {
    if (open) {
      setConfirmUsername("");
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
    if (!admin) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admins/${admin.id}/permanent-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmUsername }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo eliminar la cuenta");
        return;
      }
      toast.success("Cuenta eliminada de forma permanente");
      onDeleted();
    } catch {
      setError("Error de conexión");
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
      className="m-auto w-[min(92vw,30rem)] rounded-2xl border border-danger/40 bg-surface p-0 text-foreground backdrop:bg-black/50"
    >
      {admin && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold text-danger">Eliminar escuela permanentemente</h2>
          <p className="text-sm text-muted-foreground">
            Se van a borrar para siempre todos los alumnos, horarios, orientadores, asistencias,
            graduaciones, itinerancias, exportaciones y fotos de{" "}
            <span className="font-medium text-foreground">{admin.displayName}</span> (@{admin.username}).
            No se puede deshacer.
          </p>
          <p className="text-sm font-medium text-danger">
            Usá esto solo si la escuela pidió la baja por mail, según la Sección 7 de los Términos y
            Condiciones. Para una cuenta que no pidió la baja, usá &quot;Desactivar&quot; en su lugar.
          </p>
          <Input
            label={`Escribí "${admin.username}" para confirmar`}
            value={confirmUsername}
            onChange={(e) => setConfirmUsername(e.target.value)}
            autoComplete="off"
            required
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" loading={busy} disabled={confirmUsername !== admin.username}>
              Eliminar permanentemente
            </Button>
          </div>
        </form>
      )}
    </dialog>
  );
}
