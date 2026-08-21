"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type AppHeaderProps = {
  /** Slug de la escuela actual (páginas bajo /escuela/[slug]/...). Si no se pasa, no hay nav de escuela. */
  slug?: string;
};

export function AppHeader({ slug }: AppHeaderProps = {}) {
  const pathname = usePathname();

  const links = slug
    ? [
        { href: `/escuela/${slug}`, label: "Asistencia" },
        { href: `/escuela/${slug}/clases-anteriores`, label: "Clases anteriores" },
        { href: `/escuela/${slug}/historial`, label: "Historial" },
      ]
    : [];

  return (
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

      <nav className="flex items-center gap-1 overflow-x-auto">
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

      <div className="hidden items-center gap-3 sm:flex">
        <Link href="/admin" className="text-xs text-muted-foreground hover:underline">
          Admin
        </Link>
      </div>
    </header>
  );
}
