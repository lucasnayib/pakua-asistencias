import Image from "next/image";

/**
 * Header mínimo, propio del evento — a propósito NO es AppHeader (ese trae el login/nav del
 * sitio principal, justo lo que esta sección tiene que evitar: "no tiene relación con el
 * sitio original").
 */
export function EncuentroHeader() {
  return (
    <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
      <Image src="/logo.png" alt="Pakua" width={1554} height={514} priority className="h-8 w-auto dark:invert" />
      <span className="text-sm font-medium text-muted-foreground">Encuentro</span>
    </header>
  );
}
