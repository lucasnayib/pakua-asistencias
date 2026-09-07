"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

type ItineranciaUnlockGateProps = {
  slug: string;
  schoolName: string;
};

/**
 * Candado propio de Itinerancias — separado del de asistencia (SchoolUnlockGate). Pide el
 * código específico de Itinerancias, nunca la contraseña real de la escuela.
 */
export function ItineranciaUnlockGate({ slug, schoolName }: ItineranciaUnlockGateProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/schools/${slug}/itinerancia-unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "No se pudo desbloquear");
        return;
      }
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm p-8">
        <h1 className="mb-1 text-center text-xl font-semibold">Itinerancias — {schoolName}</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Ingresá el código de Itinerancias para ver las actividades y anotarte
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Código de Itinerancias"
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
  );
}
