"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function OlvidePasswordPage() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo procesar el pedido");
        return;
      }
      setMessage(data.message);
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
        <h1 className="mb-1 text-center text-xl font-semibold">¿Olvidaste tu contraseña?</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Ingresá tu usuario y, si tenés un mail de contacto registrado, te mandamos un link para
          elegir una contraseña nueva.
        </p>

        {message ? (
          <p className="rounded-lg border border-border bg-surface-2 p-4 text-center text-sm text-muted-foreground">
            {message}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Usuario"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" loading={loading} className="mt-2 w-full">
              Enviar
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
