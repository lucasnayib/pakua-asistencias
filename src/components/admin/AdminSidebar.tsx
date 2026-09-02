"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GoToAttendanceLink } from "./GoToAttendanceLink";

const LINKS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/alumnos", label: "Alumnos" },
  { href: "/admin/orientadores", label: "Orientadores" },
  { href: "/admin/horarios", label: "Horarios" },
  { href: "/admin/asignaciones", label: "Asignaciones" },
  { href: "/admin/exportaciones", label: "Exportaciones" },
  { href: "/admin/estadisticas", label: "Estadísticas" },
  { href: "/admin/facturacion", label: "Facturación" },
  { href: "/admin/ubicacion", label: "Ubicación" },
  { href: "/admin/mi-cuenta", label: "Mi cuenta" },
];

const SUPER_ADMIN_LINKS = [
  { href: "/admin/admins", label: "Administradores" },
  { href: "/admin/backups", label: "Copias de seguridad" },
  { href: "/admin/dos-factores", label: "Seguridad" },
];

export function AdminSidebar({
  displayName,
  role,
  schoolSlug,
  pendingAdminCount = 0,
}: {
  displayName: string;
  role: string;
  schoolSlug?: string | null;
  pendingAdminCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // El super-admin no tiene acceso a datos de escuela: solo ve la gestión de cuentas.
  const links = role === "SUPER_ADMIN" ? SUPER_ADMIN_LINKS : LINKS;

  // Cerrar el menú al cambiar de página (incluye navegación programática, no solo clicks).
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Bloquear el scroll de fondo mientras el menú está abierto en mobile.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <>
      {/* Barra superior solo en mobile: logo + botón hamburguesa. En md+ no se muestra, la
          barra lateral queda siempre visible y fija. */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface p-4 md:hidden">
        <Image
          src="/logo.png"
          alt="Pakua"
          width={1554}
          height={514}
          priority
          className="h-8 w-auto dark:invert"
        />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={mobileOpen}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg transition hover:bg-surface-2"
        >
          <span className="h-0.5 w-5 rounded-full bg-foreground" />
          <span className="h-0.5 w-5 rounded-full bg-foreground" />
          <span className="h-0.5 w-5 rounded-full bg-foreground" />
        </button>
      </header>

      {/* Fondo oscuro detrás del menú, solo visible (y clickeable) en mobile mientras está abierto. */}
      <div
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity duration-300 md:hidden ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-surface p-6 shadow-2xl transition-transform duration-300 ease-in-out md:sticky md:top-0 md:z-20 md:h-dvh md:w-64 md:max-w-none md:translate-x-0 md:shadow-none md:transition-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="hidden md:block">
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

        <nav className="flex flex-1 flex-col gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.97] ${
                  active ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-surface-2"
                }`}
              >
                {link.label}
                {link.href === "/admin/admins" && pendingAdminCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-semibold text-white">
                    {pendingAdminCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <GoToAttendanceLink
              href={schoolSlug ? `/escuela/${schoolSlug}` : "/"}
              className="text-xs text-muted-foreground hover:underline"
            >
              Ir a toma de asistencia
            </GoToAttendanceLink>
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
    </>
  );
}
