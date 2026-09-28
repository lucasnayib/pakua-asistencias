"use client";

import { useEffect, useRef } from "react";

type PhotoLightboxProps = {
  open: boolean;
  photoUrl: string | null;
  alt: string;
  onClose: () => void;
};

/** Foto ampliada en un dialog nativo — mismo patrón showModal()/close() que el resto de la app. */
export function PhotoLightbox({ open, photoUrl, alt, onClose }: PhotoLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!photoUrl) return null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Cerrar al tocar el backdrop (fuera del <img>), no al tocar la foto en sí.
        if (e.target === dialogRef.current) onClose();
      }}
      className="m-auto max-h-[90vh] max-w-[90vw] rounded-2xl border border-border bg-surface p-2 backdrop:bg-black/80"
    >
      <div className="relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-lg leading-none text-white hover:bg-black/80"
        >
          ✕
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element -- tamaño dinámico según la foto, no encaja con next/image fill */}
        <img
          src={photoUrl}
          alt={alt}
          className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain"
        />
      </div>
    </dialog>
  );
}
