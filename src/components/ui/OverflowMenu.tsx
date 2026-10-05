"use client";

import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";

// Igual a la duración de overflow-menu-out en globals.css.
const CLOSE_ANIMATION_MS = 140;

export type OverflowMenuItem = { label: string; onSelect: () => void; danger?: boolean };

export function OverflowMenu({ items, label = "Más acciones" }: { items: OverflowMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const requestClose = useCallback(() => {
    if (open) setClosing(true);
  }, [open]);

  useEffect(() => {
    if (!open || closing) return;
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) requestClose();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, closing, requestClose]);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, CLOSE_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open && !closing}
        onClick={() => (open ? requestClose() : setOpen(true))}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-surface-2"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute right-0 z-20 mt-1 flex min-w-44 flex-col rounded-lg border border-border bg-surface p-1 shadow-key ${
            closing ? "overflow-menu-closing" : "overflow-menu-open"
          }`}
        >
          {items.map((item, index) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                requestClose();
                item.onSelect();
              }}
              style={{ "--item-delay": `${index * 40 + 60}ms` } as CSSProperties}
              className={`overflow-menu-item rounded-md px-3 py-2 text-left text-sm transition hover:bg-surface-2 ${
                item.danger ? "text-danger" : "text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
