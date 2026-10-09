"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { EncuentroHeader } from "./EncuentroHeader";

type EncuentroCodeGateProps = {
  /** Código que venía en la URL (?c=...). Si está, se intenta validar solo, sin que la
   * persona tenga que tocar nada. */
  initialCode?: string;
};

/**
 * Mismo esquema que SchoolUnlockGate, pero el código viaja en la URL (QR) en vez de
 * pedirse siempre a mano, y al validar se limpia la URL con router.replace en vez de
 * quedarse en la misma página — un Server Component no puede setear cookies, así que este
 * paso tiene que pasar en un client component.
 */
export function EncuentroCodeGate({ initialCode }: EncuentroCodeGateProps) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const autoSubmitted = useRef(false);

  async function verify(value: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/encuentro/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "No se pudo verificar el código");
        return;
      }
      router.replace("/encuentro");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialCode && !autoSubmitted.current) {
      autoSubmitted.current = true;
      verify(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await verify(code);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <EncuentroHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10">
        <Card className="w-full max-w-sm p-8">
          <h1 className="mb-1 text-center text-xl font-semibold">Encuentro</h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Ingresá el código del cartel para subir tus fotos y videos
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Código"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
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
