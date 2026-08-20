"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/alumnos", label: "Alumnos" },
  { href: "/admin/orientadores", label: "Orientadores" },
  { href: "/admin/horarios", label: "Horarios" },
  { href: "/admin/asignaciones", label: "Asignaciones" },
  { href: "/admin/exportaciones", label: "Exportaciones" },
  { href: "/admin/estadisticas", label: "Estadísticas" },
  { href: "/admin/backups", label: "Copias de seguridad" },
];

export function AdminSidebar({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 z-20 flex max-h-dvh w-full shrink-0 flex-col gap-6 overflow-y-auto border-b border-border bg-surface p-4 md:h-dvh md:w-64 md:border-b-0 md:border-r md:p-6">
      <div>
        <Image
          src="/logo.png"
          alt="Pakua"
          width={1554}
          height={514}
          priority
          className="h-9 w-auto dark:invert"
        />
        <p className="mt-1 text-xs text-muted-foreground">Panel de administración</p>
      </div>

      <nav className="flex flex-1 flex-row flex-wrap gap-1 md:flex-col">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-surface-2"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{username}</p>
          <Link href="/" className="text-xs text-muted-foreground hover:underline">
            Ir a toma de asistencia
          </Link>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="text-xs font-medium text-muted-foreground hover:text-danger disabled:opacity-50"
        >
          Salir
        </button>
      </div>
    </aside>
  );
}
