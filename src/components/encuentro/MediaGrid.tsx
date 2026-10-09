"use client";

export type MediaGridItem = { id: string; kind: "photo" | "video" };

type MediaGridProps = {
  items: MediaGridItem[];
  thumbUrl: (id: string) => string;
  fullUrl: (id: string) => string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onOpenIndex?: (index: number) => void;
};

/**
 * Grilla tipo mosaico compartida por la galería pública y las dos grillas del panel
 * (pendientes/aprobados). Las fotos usan la miniatura liviana (sharp); los videos no tienen
 * una miniatura generada — usan <video preload="metadata">, que trae solo el primer frame +
 * metadata vía un Range chico (ver src/lib/encuentro-media.ts), sin descargar el video entero.
 */
export function MediaGrid({
  items,
  thumbUrl,
  fullUrl,
  selectable = false,
  selectedIds,
  onToggleSelect,
  onOpenIndex,
}: MediaGridProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No hay nada para mostrar.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item, index) => {
        const selected = selectedIds?.has(item.id) ?? false;
        return (
          <div
            key={item.id}
            className="media-tile relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-2"
            style={{ "--item-delay": `${Math.min(index, 20) * 25}ms` } as React.CSSProperties}
          >
            <button
              type="button"
              className="h-full w-full cursor-zoom-in"
              onClick={() => onOpenIndex?.(index)}
              aria-label="Ver en grande"
            >
              {item.kind === "photo" ? (
                // eslint-disable-next-line @next/next/no-img-element -- tamaño dinámico, mismo criterio que PhotoLightbox
                <img src={thumbUrl(item.id)} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <video
                  src={fullUrl(item.id)}
                  preload="metadata"
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              )}
              {item.kind === "video" && (
                <span className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="6 3 20 12 6 21 6 3" />
                  </svg>
                </span>
              )}
            </button>

            {selectable && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect?.(item.id);
                }}
                aria-label={selected ? "Quitar selección" : "Seleccionar"}
                className={`absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
                  selected ? "border-accent bg-accent text-accent-foreground" : "border-white/80 bg-black/30"
                }`}
              >
                {selected && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
