"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

type SchoolResult = { slug: string; displayName: string };

export function SchoolSearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SchoolResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults(null);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/schools/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => setResults(data.schools ?? []))
        .catch(() => { })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const showNoResults = results !== null && results.length === 0 && !loading;

  return (
    <div className="flex w-full flex-col gap-3">
      <Input
        label="Buscá tu escuela"
        placeholder="Ej: Federación Mundial Córdoba"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" /> Buscando…
        </div>
      )}

      {results && results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((school) => (
            <Link key={school.slug} href={`/escuela/${school.slug}`}>
              <Card className="flex items-center justify-between p-3 transition hover:border-accent">
                <span className="text-sm font-medium">{school.displayName}</span>
                <span className="text-xs text-muted-foreground">Ingresar →</span>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {showNoResults && (
        <p className="text-sm text-muted-foreground">
          No encontramos ninguna escuela con ese nombre.{" "}
          <Link href="/registrar-escuela" className="text-accent hover:underline">
            ¿Querés registrar la tuya?
          </Link>
        </p>
      )}
    </div>
  );
}
