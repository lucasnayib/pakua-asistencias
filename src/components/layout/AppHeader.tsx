"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type AppHeaderProps = {
  /** Slug de la escuela actual (páginas bajo /escuela/[slug]/...). Si no se pasa, no hay nav de escuela. */
  slug?: string;
};

export function AppHeader({ slug }: AppHeaderProps = {}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = slug
    ? [
        { href: `/escuela/${slug}`, label: "Asistencia" },
        { href: `/escuela/${slug}/clases-anteriores`, label: "Clases anteriores" },
        { href: `/escuela/${slug}/historial`, label: "Historial" },
      ]
    : [];

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur sm:px-6">
        <span className="flex shrink-0 items-center">
          <Image
            src="/logo.png"
            alt="Pakua"
            width={1554}
            height={514}
            priority
            className="h-8 w-auto dark:invert"
          />
        </span>

        <nav className="hidden items-center gap-1 overflow-x-auto md:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-surface-2"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/admin"
            className="rounded-lg border border-accent px-4 py-1.5 text-sm font-medium text-accent transition hover:bg-accent hover:text-accent-foreground"
          >
            Accedé a tu escuela
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={mobileOpen}
          className="flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg transition hover:bg-surface-2 md:hidden"
        >
          <span className="h-0.5 w-5 rounded-full bg-foreground" />
          <span className="h-0.5 w-5 rounded-full bg-foreground" />
          <span className="h-0.5 w-5 rounded-full bg-foreground" />
        </button>
      </header>

      <div
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity duration-300 md:hidden ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto bg-surface p-6 shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Image
          src="/logo.png"
          alt="Pakua"
          width={1554}
          height={514}
          priority
          className="h-8 w-auto dark:invert"
        />

        <nav className="flex flex-1 flex-col gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.97] ${
                  active ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-surface-2"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border pt-4">
          <Link
            href="/admin"
            className="block rounded-lg border border-accent px-3 py-2 text-center text-sm font-medium text-accent transition-all duration-150 active:scale-[0.97]"
          >
            Accedé a tu escuela
          </Link>
        </div>
      </aside>
    </>
  );
}
