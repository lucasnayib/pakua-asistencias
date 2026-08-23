"use client";

import { FormEvent, Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar sesión");
        return;
      }
      const from = searchParams.get("from");
      // El super-admin no tiene escuela: si no pidió explícitamente una pantalla de cuentas
      // (la única a la que tiene acceso), lo mandamos directo ahí en vez del dashboard.
      const isSuperAdmin = data.role === "SUPER_ADMIN";
      const canReachFrom = from && (!isSuperAdmin || from.startsWith("/admin/admins"));
      const destination = canReachFrom ? from : isSuperAdmin ? "/admin/admins" : "/admin";
      router.push(destination);
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
        <Image
          src="/logo.png"
          alt="Pakua"
          width={1554}
          height={514}
          priority
          className="mx-auto mb-4 block h-12 w-auto dark:invert"
        />
        <h1 className="mb-1 text-center text-xl font-semibold">Panel de administración</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">Ingresá tus credenciales para continuar</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Usuario"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" loading={loading} className="mt-2 w-full">
            Ingresar
          </Button>
        </form>
        <Link
          href="/"
          className="mt-4 block text-center text-sm text-muted-foreground hover:underline"
        >
          Ir a toma de asistencia
        </Link>
        <Link
          href="/registrar-escuela"
          className="mt-2 block text-center text-sm text-muted-foreground hover:underline"
        >
          ¿Sos una escuela nueva? Registrate acá
        </Link>
      </Card>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
