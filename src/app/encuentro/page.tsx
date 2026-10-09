import { notFound } from "next/navigation";
import { getEncuentroUploadAccess } from "@/lib/encuentro-upload-access";
import { isEncuentroUploadsEnabled } from "@/lib/encuentro-env";
import { EncuentroCodeGate } from "@/components/encuentro/EncuentroCodeGate";
import { EncuentroUploadClient } from "@/components/encuentro/EncuentroUploadClient";
import { EncuentroHeader } from "@/components/encuentro/EncuentroHeader";

// Sin segmento dinámico en la ruta, Next intenta prerenderizarla estática en el build. Si en
// ese momento EVENT_UPLOAD_CODE está vacía, la ejecución corta en notFound() antes de leer
// cookies/searchParams y Next la marca estática — quedaría un 404 congelado para siempre,
// incluso después de configurar la variable y reiniciar. force-dynamic la vuelve a evaluar
// en cada request, siempre.
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ c?: string }> };

export default async function EncuentroPage({ searchParams }: Props) {
  // Nunca configurado: la sección no existe, punto — se comporta como cualquier ruta
  // inexistente del sitio.
  if (!process.env.EVENT_UPLOAD_CODE) {
    notFound();
  }

  // Configurado pero cerrado (ej. después del evento): aviso claro, no un 404 pelado — hay
  // gente que puede llegar acá con un link guardado de cuando sí funcionaba.
  if (!isEncuentroUploadsEnabled()) {
    return (
      <div className="flex min-h-dvh flex-col">
        <EncuentroHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <h1 className="text-xl font-semibold">La carga ya cerró</h1>
          <p className="text-sm text-muted-foreground">
            Gracias por tus fotos y videos del encuentro. La carga ya no está disponible.
          </p>
        </main>
      </div>
    );
  }

  const hasAccess = await getEncuentroUploadAccess();
  if (hasAccess) {
    return <EncuentroUploadClient />;
  }

  const { c } = await searchParams;
  return <EncuentroCodeGate initialCode={c} />;
}
