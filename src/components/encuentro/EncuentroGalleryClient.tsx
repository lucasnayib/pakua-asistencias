"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { EncuentroHeader } from "./EncuentroHeader";
import { EncuentroPrivacyNotice } from "./EncuentroPrivacyNotice";
import { MediaGrid, type MediaGridItem } from "./MediaGrid";
import { MediaLightbox } from "./MediaLightbox";

const thumbUrl = (id: string) => `/api/encuentro/galeria/media/${id}/thumb`;
const fullUrl = (id: string) => `/api/encuentro/galeria/media/${id}/full`;

async function fetchPage(offset: number): Promise<{ items: MediaGridItem[]; hasMore: boolean } | null> {
  const res = await fetch(`/api/encuentro/galeria/media?offset=${offset}`);
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) return null;
  return data as { items: MediaGridItem[]; hasMore: boolean };
}

export function EncuentroGalleryClient() {
  const [items, setItems] = useState<MediaGridItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);

  // La carga inicial siempre REEMPLAZA el estado, nunca lo agrega: en modo desarrollo React
  // invoca los efectos dos veces (StrictMode), y si esto agregara en vez de reemplazar, cada
  // foto quedaría duplicada en la grilla.
  useEffect(() => {
    let cancelled = false;
    fetchPage(0)
      .then((data) => {
        if (cancelled || !data) return;
        setItems(data.items);
        setHasMore(data.hasMore);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(async (offset: number) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoadingMore(true);
    const data = await fetchPage(offset);
    if (data) {
      setItems((current) => [...current, ...data.items]);
      setHasMore(data.hasMore);
    }
    setLoadingMore(false);
    fetchingRef.current = false;
  }, []);

  // Scroll infinito: sin botón "Ver más" — un sentinel invisible al pie de la grilla dispara
  // la carga de la página siguiente apenas entra en vista. La paginación en sí se mantiene
  // (ver src/app/api/encuentro/galeria/media/route.ts) por ancho de banda; esto solo cambia
  // cómo se dispara cada página.
  useEffect(() => {
    if (!hasMore || loading) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore(items.length);
      },
      { rootMargin: "600px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, items.length, loadMore]);

  return (
    <div className="flex min-h-dvh flex-col">
      <EncuentroHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold">Fotos y videos del encuentro</h1>
          <p className="text-sm text-muted-foreground">Todo lo que subieron los asistentes, ya revisado.</p>
        </div>

        <EncuentroPrivacyNotice />

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <>
            <MediaGrid
              items={items}
              thumbUrl={thumbUrl}
              fullUrl={fullUrl}
              onOpenIndex={(index) => setOpenIndex(index)}
            />
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-4">
                {loadingMore && <Spinner className="h-5 w-5" />}
              </div>
            )}
          </>
        )}
      </main>

      <MediaLightbox
        items={items}
        index={openIndex}
        fullUrl={fullUrl}
        onClose={() => setOpenIndex(null)}
        onNavigate={setOpenIndex}
      />
    </div>
  );
}
