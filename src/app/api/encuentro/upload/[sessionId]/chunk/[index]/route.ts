import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import checkDiskSpace from "check-disk-space";
import { requireEncuentroUploadAccess } from "@/lib/encuentro-upload-access";
import { isEncuentroUploadsEnabled } from "@/lib/encuentro-env";
import {
  assembleUploadSession,
  listReceivedChunks,
  readSessionMeta,
  writeSessionChunk,
} from "@/lib/encuentro-upload";
import { EVENTO_ROOT, MIN_FREE_DISK_BYTES } from "@/lib/encuentro-storage";

type Params = { params: Promise<{ sessionId: string; index: string }> };

// PUT a propósito: "reemplazar los bytes de esta posición numerada" es la semántica
// idempotente que necesita una parte que se puede reintentar sin riesgo.
export async function PUT(request: NextRequest, { params }: Params) {
  if (!isEncuentroUploadsEnabled()) {
    return NextResponse.json({ error: "La carga ya no está disponible." }, { status: 404 });
  }
  const access = await requireEncuentroUploadAccess();
  if (access !== true) return access;

  const { sessionId, index: indexParam } = await params;
  const index = Number(indexParam);
  if (!Number.isInteger(index) || index < 0) {
    return NextResponse.json({ error: "Índice de parte inválido" }, { status: 400 });
  }

  const meta = await readSessionMeta(sessionId);
  if (!meta) {
    return NextResponse.json({ error: "Sesión de subida no encontrada o vencida" }, { status: 404 });
  }
  if (index >= meta.totalChunks) {
    return NextResponse.json({ error: "Índice de parte inválido" }, { status: 400 });
  }

  // Cuerpo crudo, sin multipart ni JSON envolviendo: el tamaño del body tiene que ser
  // exactamente el de la parte, sin overhead de framing contra el techo de proxy de Next.
  const buffer = Buffer.from(await request.arrayBuffer());

  const expectedHash = request.headers.get("x-chunk-sha256");
  if (!expectedHash) {
    return NextResponse.json({ error: "Falta el hash de la parte" }, { status: 400 });
  }
  const actualHash = createHash("sha256").update(buffer).digest("hex");
  if (actualHash !== expectedHash.toLowerCase()) {
    return NextResponse.json({ error: "El hash de la parte no coincide" }, { status: 422 });
  }

  // Throttle: en el índice 0 y después cada 20 (~cada 160MB), no en cada parte — acota los
  // llamados al sistema operativo para un archivo de 1GB a un puñado, pero igual cubre el
  // riesgo de varias subidas concurrentes drenando el disco juntas.
  if (index === 0 || index % 20 === 0) {
    try {
      const disk = await checkDiskSpace(EVENTO_ROOT);
      if (disk.free < MIN_FREE_DISK_BYTES) {
        return NextResponse.json(
          { error: "No hay espacio suficiente en el servidor en este momento. Probá más tarde." },
          { status: 507 }
        );
      }
    } catch {
      // red de seguridad, no el único control — no bloqueamos la subida si el chequeo en sí falla
    }
  }

  await writeSessionChunk(sessionId, index, buffer);

  const received = await listReceivedChunks(sessionId);
  if (received.length < meta.totalChunks) {
    return NextResponse.json({ received: index, complete: false });
  }

  const result = await assembleUploadSession(sessionId);
  if (!result.complete) {
    return NextResponse.json({ received: index, complete: false, error: result.error });
  }

  return NextResponse.json({ received: index, complete: true });
}
