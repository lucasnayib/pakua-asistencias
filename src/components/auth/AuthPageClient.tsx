"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Card } from "@/components/ui/Card";
import { slugify } from "@/lib/slug";
import { AuthCard, type AuthMode } from "./AuthCard";

type AuthPageClientProps = {
  priceArs: string | null;
};

export function AuthPageClient({ priceArs }: AuthPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode: AuthMode = searchParams.get("mode") === "register" ? "register" : "login";

  function setMode(next: AuthMode) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "login") params.delete("mode");
    else params.set("mode", next);
    const query = params.toString();
    router.push(`/admin/login${query ? `?${query}` : ""}`);
  }

  // --- Login ---
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  function goAfterLogin(role: string) {
    const from = searchParams.get("from");
    // El super-admin no tiene escuela: si no pidió explícitamente una pantalla de cuentas
    // (la única a la que tiene acceso), lo mandamos directo ahí en vez del dashboard.
    const isSuperAdmin = role === "SUPER_ADMIN";
    const canReachFrom = from && (!isSuperAdmin || from.startsWith("/admin/admins"));
    const destination = canReachFrom ? from : isSuperAdmin ? "/admin/admins" : "/admin";
    router.push(destination);
    router.refresh();
  }

  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error ?? "No se pudo iniciar sesión");
        return;
      }
      if (data.requiresTwoFactor) {
        setTempToken(data.tempToken);
        return;
      }
      goAfterLogin(data.role);
    } catch {
      setLoginError("Error de conexión");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleVerifyTwoFactor(e: FormEvent) {
    e.preventDefault();
    if (!tempToken) return;
    setTwoFactorError(null);
    setTwoFactorLoading(true);
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, code: twoFactorCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTwoFactorError(data.error ?? "No se pudo verificar el código");
        return;
      }
      goAfterLogin(data.role);
    } catch {
      setTwoFactorError("Error de conexión");
    } finally {
      setTwoFactorLoading(false);
    }
  }

  // --- Registro de escuela nueva ---
  const [displayName, setDisplayName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const slugPreview = slugify(displayName);

  async function handleRegisterSubmit(e: FormEvent) {
    e.preventDefault();
    setRegError(null);
    setRegLoading(true);
    try {
      const res = await fetch("/api/schools/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          username: regUsername,
          password: regPassword,
          contactEmail,
          contactPhone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error ?? "No se pudo enviar la solicitud");
        return;
      }
      setSent(true);
    } catch {
      setRegError("Error de conexión");
    } finally {
      setRegLoading(false);
    }
  }

  if (tempToken) {
    return (
      <main className="bg-dot-grid flex min-h-dvh items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm p-8">
          <Image
            src="/logo.png"
            alt="Pakua"
            width={1554}
            height={514}
            priority
            className="mx-auto mb-4 block h-12 w-auto dark:invert"
          />
          <h1 className="mb-1 text-center text-xl font-semibold">Verificación en dos pasos</h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Ingresá el código de tu app de autenticación, o un código de respaldo.
          </p>
          <form onSubmit={handleVerifyTwoFactor} className="flex flex-col gap-4">
            <Input
              label="Código"
              autoComplete="one-time-code"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              required
            />
            {twoFactorError && <p className="text-sm text-danger">{twoFactorError}</p>}
            <Button type="submit" loading={twoFactorLoading} className="mt-2 w-full">
              Verificar
            </Button>
          </form>
          <button
            type="button"
            onClick={() => {
              setTempToken(null);
              setTwoFactorCode("");
              setTwoFactorError(null);
            }}
            className="mt-4 block w-full text-center text-sm text-muted-foreground hover:underline"
          >
            Volver
          </button>
        </Card>
      </main>
    );
  }

  if (sent) {
    return (
      <main className="bg-dot-grid flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4">
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
    <main className="bg-dot-grid flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <Link href="/" className="block w-full max-w-4xl text-sm text-muted-foreground hover:underline">
        ← Volver al inicio
      </Link>

      <AuthCard
        mode={mode}
        onModeChange={setMode}
        priceArs={priceArs}
        loginForm={
          <div className="w-full max-w-xs">
            <Image
              src="/logo.png"
              alt="Pakua"
              width={1554}
              height={514}
              priority
              className="mx-auto mb-4 block h-12 w-auto dark:invert"
            />
            <h1 className="mb-1 text-center text-xl font-semibold">Panel de administración</h1>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              Ingresá tus credenciales para continuar
            </p>
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <Input
                label="Usuario"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <PasswordInput
                label="Contraseña"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {loginError && <p className="text-sm text-danger">{loginError}</p>}
              <Button type="submit" loading={loginLoading} className="mt-2 w-full">
                Ingresar
              </Button>
            </form>
            <Link
              href="/admin/olvide-password"
              className="mt-4 block text-center text-sm text-muted-foreground hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
            <button
              type="button"
              onClick={() => setMode("register")}
              className="mt-2 block w-full text-center text-sm text-muted-foreground hover:underline md:hidden"
            >
              ¿Sos una escuela nueva? Registrate acá
            </button>
          </div>
        }
        registerForm={
          <div className="w-full max-w-xs">
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
              Completá estos datos para pedir el alta de tu escuela.
            </p>
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
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
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                required
                maxLength={50}
              />
              <PasswordInput
                label="Contraseña"
                autoComplete="new-password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
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
              {regError && <p className="text-sm text-danger">{regError}</p>}
              <Button type="submit" loading={regLoading} className="mt-2 w-full">
                Enviar solicitud
              </Button>
            </form>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="mt-4 block w-full text-center text-sm text-muted-foreground hover:underline md:hidden"
            >
              Ya tengo una cuenta — Iniciar sesión
            </button>
          </div>
        }
      />
    </main>
  );
}
