"use client";

import { useEffect, useState } from "react";

type SchoolResolution = {
  adminId: string | null;
  schoolName: string | null;
  loading: boolean;
  notFound: boolean;
};

/**
 * Resuelve el `slug` de la URL (`/escuela/[slug]/...`) a un `adminId` real,
 * una sola vez al montar. Reemplaza el viejo selector manual + localStorage:
 * la escuela ahora la fija la URL, no un estado guardado en el dispositivo.
 */
export function useSchoolBySlug(slug: string | undefined): SchoolResolution {
  const [adminId, setAdminId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    async function resolve() {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/schools/${slug}`, { cache: "no-store" });
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setAdminId(data.id);
          setSchoolName(data.displayName);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { adminId, schoolName, loading, notFound };
}
