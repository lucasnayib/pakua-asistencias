import Link from "next/link";

export default function SchoolNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold">Escuela no encontrada</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        No existe ninguna escuela activa con esa dirección. Revisá el enlace o elegí una escuela de la lista.
      </p>
      <Link href="/" className="text-sm font-medium text-accent hover:underline">
        Ver todas las escuelas
      </Link>
    </div>
  );
}
