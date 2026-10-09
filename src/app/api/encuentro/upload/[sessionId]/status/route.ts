import { NextResponse } from "next/server";
import { requireEncuentroUploadAccess } from "@/lib/encuentro-upload-access";
import { isSessionAlreadyAssembled, listReceivedChunks, readSessionMeta } from "@/lib/encuentro-upload";

type Params = { params: Promise<{ sessionId: string }> };

// Para reanudar tras un corte/reconexión dentro de la misma pestaña: el cliente pregunta qué
// partes ya están en el servidor antes de reenviar nada. No resuelve "cerrar el navegador y
// volver días después" — eso necesitaría que la persona vuelva a elegir el mismo archivo.
export async function GET(_request: Request, { params }: Params) {
  const access = await requireEncuentroUploadAccess();
  if (access !== true) return access;

  const { sessionId } = await params;
  const meta = await readSessionMeta(sessionId);
  if (!meta) {
    return NextResponse.json({ error: "Sesión de subida no encontrada o vencida" }, { status: 404 });
  }

  // Cubre el caso de que ya se haya terminado de ensamblar justo cuando se cortó la conexión.
  if (await isSessionAlreadyAssembled(meta)) {
    return NextResponse.json({
      sessionId,
      totalChunks: meta.totalChunks,
      chunkSize: meta.chunkSize,
      existingChunks: Array.from({ length: meta.totalChunks }, (_, i) => i),
      complete: true,
    });
  }

  const existingChunks = await listReceivedChunks(sessionId);
  return NextResponse.json({
    sessionId,
    totalChunks: meta.totalChunks,
    chunkSize: meta.chunkSize,
    existingChunks,
    complete: false,
  });
}
