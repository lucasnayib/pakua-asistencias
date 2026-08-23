"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { slugify } from "@/lib/slug";

export default function RegistrarEscuelaPage() {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const slugPreview = slugify(displayName);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/schools/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, username, password, contactEmail, contactPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo enviar la solicitud");
        return;
      }
      setSent(true);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm p-8 text-center">
          <Image
            src="/logo.png"
            alt="Pakua"
            width={1554}
            height={514}
            priority
            className="mx-auto mb-4 block h-12 w-auto dark:invert"
          />
          <h1 className="mb-2 text-xl font-semibold">Solicitud recibida</h1>
          <p className="text-sm text-muted-foreground">
            Tu solicitud fue recibida. Un administrador la va a revisar antes de habilitar el acceso.
          </p>
          <Link href="/admin/login" className="mt-6 block text-sm text-accent hover:underline">
            Volver al inicio de sesión
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-sm p-8">
        <Image
          src="/logo.png"
          alt="Pakua"
          width={1554}
          height={514}
          priority
          className="mx-auto mb-4 block h-12 w-auto dark:invert"
        />
        <h1 className="mb-1 text-center text-xl font-semibold">Registrar escuela nueva</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Completá estos datos para pedir el alta de tu escuela. Un administrador va a revisar tu
          solicitud antes de habilitar el acceso.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Input
              label="Nombre de la escuela"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={100}
            />
            <p className="truncate text-xs text-muted-foreground">
              {origin || "tudominio.com"}/escuela/{slugPreview || "…"}
            </p>
          </div>
          <Input
            label="Usuario"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            maxLength={50}
          />
          <Input
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <Input
            label="Email de contacto"
            type="email"
            autoComplete="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />
          <Input
            label="Teléfono de contacto"
            type="tel"
            autoComplete="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            required
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" loading={loading} className="mt-2 w-full">
            Enviar solicitud
          </Button>
        </form>
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
