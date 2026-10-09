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
 *
 * El celular es el dispositivo principal para esta sección (ver OPERACIONES.md), así que el
 * swipe es la forma de navegar que más importa, no un agregado: la imagen sigue al dedo en
 * vivo (en vez de solo detectar el gesto al soltar) y `touch-action: pan-y` evita que el
 * navegador se quede esperando ~300ms a ver si es un scroll antes de darnos el gesto — esa
 * espera es lo que hacía sentir "trabado" el deslizamiento. Las flechas, antes ocultas en
 * mobile (`sm:flex`), quedan visibles siempre como alternativa para video (el swipe sobre el
 * propio <video> compite con sus controles nativos de scrubbing).
 */
export function MediaLightbox({ items, index, fullUrl, onClose, onNavigate }: MediaLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const dragAxisLocked = useRef<"horizontal" | "vertical" | null>(null);
  const [lastIndex, setLastIndex] = useState<number | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const open = index !== null;
  const displayIndex = index ?? lastIndex;
  const item = displayIndex !== null ? items[displayIndex] : null;
  const hasPrev = displayIndex !== null && displayIndex > 0;
  const hasNext = displayIndex !== null && displayIndex < items.length - 1;

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

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchStartY.current = e.touches[0]?.clientY ?? null;
    dragAxisLocked.current = null;
    setDragging(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const currentX = e.touches[0]?.clientX ?? touchStartX.current;
    const currentY = e.touches[0]?.clientY ?? touchStartY.current;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;

    // Recién se decide si el gesto es horizontal o vertical una vez que se mueve lo
    // suficiente — así un toque casi quieto no "traba" el eje de golpe.
    if (dragAxisLocked.current === null && (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8)) {
      dragAxisLocked.current = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
    }
    if (dragAxisLocked.current !== "horizontal") return;

    // Sin esto, el navegador intenta decidir si es scroll y demora el gesto ~300ms, que es
    // lo que lo hacía sentir trabado — con touch-action: pan-y de por sí ya ayuda, esto es
    // el refuerzo para cuando el gesto ya se identificó como horizontal.
    e.preventDefault();

    // No deja arrastrar más allá de una foto hacia los costados: se nota que no hay nada
    // más para ese lado en vez de arrastrar sin sentido.
    const atEdge = (deltaX > 0 && !hasPrev) || (deltaX < 0 && !hasNext);
    setDragX(atEdge ? deltaX / 3 : deltaX);
  }

  function handleTouchEnd() {
    setDragging(false);
    const deltaX = dragX;
    setDragX(0);
    touchStartX.current = null;
    touchStartY.current = null;
    if (dragAxisLocked.current !== "horizontal" || displayIndex === null) return;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
    if (deltaX < 0 && hasNext) onNavigate(displayIndex + 1);
    if (deltaX > 0 && hasPrev) onNavigate(displayIndex - 1);
  }

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
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "pan-y" }}
      className="modal-dialog m-auto max-h-[94vh] max-w-[94vw] rounded-2xl border border-border bg-surface p-2 backdrop:bg-black/85"
    >
      {item && displayIndex !== null && (
        <>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-lg leading-none text-white hover:bg-black/80"
          >
            ✕
          </button>

          {hasPrev && (
            <button
              type="button"
              onClick={() => onNavigate(displayIndex - 1)}
              aria-label="Anterior"
              className="absolute left-1.5 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-2xl text-white active:bg-black/80 sm:hover:bg-black/80"
            >
              ‹
            </button>
          )}
          {hasNext && (
            <button
              type="button"
              onClick={() => onNavigate(displayIndex + 1)}
              aria-label="Siguiente"
              className="absolute right-1.5 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-2xl text-white active:bg-black/80 sm:hover:bg-black/80"
            >
              ›
            </button>
          )}

          <div
            className="flex max-h-[90vh] max-w-[90vw] items-center justify-center"
            style={{
              transform: dragX !== 0 ? `translateX(${dragX}px)` : undefined,
              transition: dragging ? "none" : "transform 200ms ease-out",
            }}
          >
            {item.kind === "photo" ? (
              // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que PhotoLightbox
              <img src={fullUrl(item.id)} alt="" className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" draggable={false} />
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
