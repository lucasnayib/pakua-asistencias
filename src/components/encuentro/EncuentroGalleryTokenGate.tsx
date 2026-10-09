"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { EncuentroHeader } from "./EncuentroHeader";

type EncuentroGalleryTokenGateProps = { initialToken?: string };

/** Mismo esquema que EncuentroCodeGate, para el link de galería (?t=...). */
export function EncuentroGalleryTokenGate({ initialToken }: EncuentroGalleryTokenGateProps) {
  const router = useRouter();
  const [token, setToken] = useState(initialToken ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const autoSubmitted = useRef(false);

  async function verify(value: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/encuentro/galeria/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: value }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "No se pudo verificar el link");
        return;
      }
      router.replace("/encuentro/galeria");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialToken && !autoSubmitted.current) {
      autoSubmitted.current = true;
      verify(initialToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialToken]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await verify(token);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <EncuentroHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10">
        <Card className="w-full max-w-sm p-8">
          <h1 className="mb-1 text-center text-xl font-semibold">Galería del Encuentro</h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Este link es privado. Si no tenés uno, pedíselo a la organización.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Link o código"
              autoFocus
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" loading={loading} className="mt-2 w-full">
              Ingresar
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
