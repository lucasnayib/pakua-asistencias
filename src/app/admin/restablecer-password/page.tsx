"use client";

import { FormEvent, Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Card } from "@/components/ui/Card";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo restablecer la contraseña");
        return;
      }
      setDone(true);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm p-8">
        <Image
          src="/logo.png"
          alt="Pakua"
          width={1554}
          height={514}
          priority
          className="mx-auto mb-4 block h-12 w-auto dark:invert"
        />
        <h1 className="mb-1 text-center text-xl font-semibold">Elegí una contraseña nueva</h1>

        {!token && (
          <p className="mt-4 text-center text-sm text-danger">
            Este link no es válido. Pedí uno nuevo desde &quot;¿Olvidaste tu contraseña?&quot;.
          </p>
        )}

        {token && done && (
          <p className="mt-4 rounded-lg border border-border bg-surface-2 p-4 text-center text-sm text-muted-foreground">
            Listo, tu contraseña se actualizó. Ya podés iniciar sesión con la nueva.
          </p>
        )}

        {token && !done && (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <PasswordInput
              label="Contraseña nueva"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            <PasswordInput
              label="Repetir contraseña"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" loading={loading} className="mt-2 w-full">
              Guardar
            </Button>
          </form>
        )}

        <Link
          href="/admin/login"
          className="mt-4 block text-center text-sm text-muted-foreground hover:underline"
        >
          Volver al inicio de sesión
        </Link>
      </Card>
    </main>
  );
}

export default function RestablecerPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
