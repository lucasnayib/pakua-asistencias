"use client";

import { useEffect, useRef } from "react";
import { InactivityDeactivationSettings } from "./InactivityDeactivationSettings";

// Igual a la duración de modal-out en globals.css.
const CLOSE_ANIMATION_MS = 140;

type InactivityDeactivationDialogProps = {
  open: boolean;
  onClose: () => void;
};

// Antes vivía como un <details> colapsable en la pestaña Alumnos; se movió a Mi cuenta porque
// es una configuración de la escuela (no algo que se toque seguido mientras se gestionan
// alumnos), mismo criterio que el resto de las opciones de ese diálogo (mail, contraseña, etc.).
export function InactivityDeactivationDialog({ open, onClose }: InactivityDeactivationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="modal-dialog m-auto w-[min(92vw,28rem)] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 className="text-lg font-semibold">Baja automática por inactividad</h2>
        <InactivityDeactivationSettings />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
          >
            Cerrar
          </button>
        </div>
      </div>
    </dialog>
  );
}
