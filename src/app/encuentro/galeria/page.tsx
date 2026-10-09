import { readEncuentroConfig } from "@/lib/encuentro-config";
import { getEncuentroGalleryAccess } from "@/lib/encuentro-gallery-access";
import { EncuentroGalleryTokenGate } from "@/components/encuentro/EncuentroGalleryTokenGate";
import { EncuentroGalleryClient } from "@/components/encuentro/EncuentroGalleryClient";
import { EncuentroHeader } from "@/components/encuentro/EncuentroHeader";

// Ver el comentario en src/app/encuentro/page.tsx: sin esto, el estado de galleryEnabled en
// el momento del build (leído de storage/evento/config.json, que puede ni existir todavía)
// quedaría congelado para siempre en vez de revisarse en cada visita.
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ t?: string }> };

export default async function EncuentroGaleriaPage({ searchParams }: Props) {
  const config = await readEncuentroConfig();

  if (!config.galleryEnabled) {
    return (
      <div className="flex min-h-dvh flex-col">
        <EncuentroHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <h1 className="text-xl font-semibold">La galería no está disponible</h1>
          <p className="text-sm text-muted-foreground">Pedile el link actualizado a la organización.</p>
        </main>
      </div>
    );
  }

  const hasAccess = await getEncuentroGalleryAccess();
  if (hasAccess) {
    return <EncuentroGalleryClient />;
  }

  const { t } = await searchParams;
  return <EncuentroGalleryTokenGate initialToken={t} />;
}
