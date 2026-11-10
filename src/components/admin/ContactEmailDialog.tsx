"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// Igual a la duración de modal-out en globals.css.
const CLOSE_ANIMATION_MS = 140;

type Step = "idle" | "code-sent";

type ContactEmailDialogProps = {
  open: boolean;
  currentEmail: string | null;
  onClose: () => void;
  onChanged: (newEmail: string) => void;
};

export function ContactEmailDialog({ open, currentEmail, onClose, onChanged }: ContactEmailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep("idle");
      setNewEmail("");
      setCode("");
      setError(null);
    }
  }, [open]);

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

  async function requestChange(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/contact-email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo enviar el código");
        return;
      }
      setStep("code-sent");
      toast.success(`Te mandamos un código a ${newEmail}`);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  async function confirmChange(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/contact-email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo confirmar el código");
        return;
      }
      toast.success("Mail de contacto actualizado");
      onChanged(data.contactEmail);
      onClose();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="modal-dialog m-auto w-[min(92vw,26rem)] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
    >
      {step === "idle" ? (
        <form onSubmit={requestChange} className="flex flex-col gap-4 p-6">
          <div>
            <h2 className="text-lg font-semibold">Mail de contacto</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Actual: {currentEmail ?? <span className="italic">sin mail cargado</span>}
            </p>
          </div>
          <Input
            label="Mail nuevo"
            type="email"
            autoFocus
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Enviar código
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={confirmChange} className="flex flex-col gap-4 p-6">
          <div>
            <h2 className="text-lg font-semibold">Confirmá el código</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ingresá el código de 6 dígitos que te mandamos a {newEmail}.
            </p>
          </div>
          <Input
            label="Código"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            required
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setStep("idle")} disabled={loading}>
              Atrás
            </Button>
            <Button type="submit" loading={loading}>
              Confirmar
            </Button>
          </div>
        </form>
      )}
    </dialog>
  );
}
