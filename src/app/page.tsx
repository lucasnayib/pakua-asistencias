import { AppHeader } from "@/components/layout/AppHeader";

/**
 * La raíz no lista escuelas: cada escuela solo se accede escribiendo su URL
 * exacta (/escuela/[slug]). Esta página es solo un punto de entrada neutro.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Para tomar asistencia, ingresá a la dirección específica de tu escuela.
        </p>
      </main>
    </div>
  );
}
