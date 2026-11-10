import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        La dirección a la que intentaste entrar no existe o se movió de lugar.
      </p>
      <Link href="/" className="text-sm font-medium text-accent hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}
