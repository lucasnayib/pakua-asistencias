"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Asistencia" },
  { href: "/clases-anteriores", label: "Clases anteriores" },
  { href: "/historial", label: "Historial" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur sm:px-6">
      <Link href="/" className="flex shrink-0 items-center">
        <Image
          src="/logo.png"
          alt="Pakua"
          width={1554}
          height={514}
          priority
          className="h-8 w-auto dark:invert"
        />
      </Link>

      <nav className="flex items-center gap-1 overflow-x-auto">
        {LINKS.map((link) => {
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

      <Link
        href="/admin"
        className="hidden text-xs text-muted-foreground hover:underline sm:inline"
      >
        Admin
      </Link>
    </header>
  );
}
