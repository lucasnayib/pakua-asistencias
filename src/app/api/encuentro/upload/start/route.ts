import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import checkDiskSpace from "check-disk-space";
import { encuentroUploadStartSchema } from "@/lib/validations";
import { requireEncuentroUploadAccess } from "@/lib/encuentro-upload-access";
import { isEncuentroUploadsEnabled } from "@/lib/encuentro-env";
import { sweepStaleUploadSessions, writeSessionMeta } from "@/lib/encuentro-upload";
import {
  ALLOWED_TYPES,
  CHUNK_SIZE_BYTES,
  EVENTO_ROOT,
  MAX_FILE_SIZE_BYTES,
  MIN_FREE_DISK_BYTES,
} from "@/lib/encuentro-storage";

export async function POST(request: NextRequest) {
  if (!isEncuentroUploadsEnabled()) {
    return NextResponse.json({ error: "La carga ya no está disponible." }, { status: 404 });
  }
  const access = await requireEncuentroUploadAccess();
  if (access !== true) return access;

  // Barrido perezoso de partes abandonadas: no hay tarea programada para esto (ver
  // OPERACIONES.md), se dispara al pasar cada vez que arranca una subida nueva.
  await sweepStaleUploadSessions();

  const body = await request.json().catch(() => null);
  const parsed = encuentroUploadStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { mime, size } = parsed.data;
  if (size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "El archivo supera 1GB." }, { status: 400 });
  }
  const typeInfo = ALLOWED_TYPES[mime];
  if (!typeInfo) {
    return NextResponse.json({ error: "Tipo de archivo no soportado." }, { status: 400 });
  }

  try {
    const disk = await checkDiskSpace(EVENTO_ROOT);
    if (disk.free < MIN_FREE_DISK_BYTES) {
      return NextResponse.json(
        { error: "No hay espacio suficiente en el servidor en este momento. Probá más tarde." },
        { status: 507 }
      );
    }
  } catch {
    // si el chequeo de disco en sí falla (ej. no se pudo resolver la unidad), no bloqueamos
    // la subida por eso solo — es una red de seguridad, no el único control
  }

  const id = randomUUID();
  const totalChunks = Math.max(1, Math.ceil(size / CHUNK_SIZE_BYTES));
  await writeSessionMeta({
    id,
    mime,
    ext: typeInfo.ext,
    kind: typeInfo.kind,
    declaredSize: size,
    chunkSize: CHUNK_SIZE_BYTES,
    totalChunks,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ sessionId: id, chunkSize: CHUNK_SIZE_BYTES, totalChunks, existingChunks: [] });
}
