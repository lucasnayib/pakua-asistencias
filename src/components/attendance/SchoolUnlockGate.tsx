"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Card } from "@/components/ui/Card";

type SchoolUnlockGateProps = {
  slug: string;
  schoolName: string;
};

/**
 * Candado que se muestra en las páginas públicas de escuela (`/escuela/[slug]/...`) cuando
 * todavía no hay una cookie de desbloqueo válida para ese slug. Pide la misma contraseña
 * que la del admin de la escuela; al acertar, recarga la página para que el Server
 * Component vuelva a evaluar `getUnlockedAdminId` y renderice el contenido real.
 */
export function SchoolUnlockGate({ slug, schoolName }: SchoolUnlockGateProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/schools/${slug}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
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
        <h1 className="mb-1 text-center text-xl font-semibold">{schoolName}</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Ingresá la contraseña de esta escuela para acceder a la asistencia
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <PasswordInput
            label="Contraseña"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
