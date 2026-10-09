"use client";

import { useEffect, useRef, useState } from "react";
import type { MediaGridItem } from "./MediaGrid";

// Igual a la duración de modal-out en globals.css.
const CLOSE_ANIMATION_MS = 140;
const SWIPE_THRESHOLD_PX = 50;

type MediaLightboxProps = {
  items: MediaGridItem[];
  index: number | null;
  fullUrl: (id: string) => string;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

/**
 * Visor a pantalla completa con deslizamiento entre fotos y videos. Escrito desde cero (no
 * extiende PhotoLightbox, que es de una sola foto, sin video ni swipe). El <dialog> se
 * renderiza siempre (nunca se hace `return null` del componente) — igual que
 * ScheduleFormDialog/ConfirmDialog/PhotoLightbox — porque si el contenido se desmontara apenas
 * `index` pasa a null, la animación de salida (modal-exit, clases de globals.css) no tendría
 * tiempo de reproducirse. Mientras se cierra, se sigue mostrando el último ítem abierto
 * (congelado vía lastIndexRef) para que no parpadee vacío durante esos ~140ms.
 */
export function MediaLightbox({ items, index, fullUrl, onClose, onNavigate }: MediaLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [lastIndex, setLastIndex] = useState<number | null>(null);

  const open = index !== null;
  const displayIndex = index ?? lastIndex;
  const item = displayIndex !== null ? items[displayIndex] : null;

  // Refs no se pueden leer/escribir durante el render (react-hooks/refs); por eso esto vive
  // en estado y se actualiza en un efecto — para cuando `index` pasa a null (cerrando), ya
  // quedó guardado el último valor y el contenido no desaparece de golpe antes de animar.
  useEffect(() => {
    if (index !== null) setLastIndex(index);
  }, [index]);

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

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index !== null && index < items.length - 1) onNavigate(index + 1);
      if (e.key === "ArrowLeft" && index !== null && index > 0) onNavigate(index - 1);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, index, items.length, onClose, onNavigate]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null || displayIndex === null) return;
        const deltaX = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
        if (deltaX < 0 && displayIndex < items.length - 1) onNavigate(displayIndex + 1);
        if (deltaX > 0 && displayIndex > 0) onNavigate(displayIndex - 1);
      }}
      className="modal-dialog m-auto max-h-[94vh] max-w-[94vw] rounded-2xl border border-border bg-surface p-2 backdrop:bg-black/85"
    >
      {item && displayIndex !== null && (
        <>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-lg leading-none text-white hover:bg-black/80"
          >
            ✕
          </button>

          {displayIndex > 0 && (
            <button
              type="button"
              onClick={() => onNavigate(displayIndex - 1)}
              aria-label="Anterior"
              className="absolute left-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 sm:flex"
            >
              ‹
            </button>
          )}
          {displayIndex < items.length - 1 && (
            <button
              type="button"
              onClick={() => onNavigate(displayIndex + 1)}
              aria-label="Siguiente"
              className="absolute right-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 sm:flex"
            >
              ›
            </button>
          )}

          <div className="flex max-h-[90vh] max-w-[90vw] items-center justify-center">
            {item.kind === "photo" ? (
              // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que PhotoLightbox
              <img src={fullUrl(item.id)} alt="" className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" />
            ) : (
              <video
                key={item.id}
                src={fullUrl(item.id)}
                controls
                playsInline
                autoPlay
                className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
              />
            )}
          </div>
        </>
      )}
    </dialog>
  );
}
