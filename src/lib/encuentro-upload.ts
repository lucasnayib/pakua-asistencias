import { createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { once } from "node:events";
import path from "node:path";
import sharp from "sharp";
import {
  EVENTO_PENDIENTES_DIR,
  EVENTO_THUMBS_DIR,
  EVENTO_TMP_DIR,
  type EncuentroKind,
  type EncuentroMediaMeta,
} from "@/lib/encuentro-storage";

export type EncuentroUploadSessionMeta = {
  id: string;
  mime: string;
  ext: string;
  kind: EncuentroKind;
  declaredSize: number;
  chunkSize: number;
  totalChunks: number;
  createdAt: string;
};

function sessionDir(sessionId: string): string {
  return path.join(EVENTO_TMP_DIR, sessionId);
}

export async function writeSessionMeta(meta: EncuentroUploadSessionMeta): Promise<void> {
  const dir = sessionDir(meta.id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "meta.json"), JSON.stringify(meta), "utf8");
}

export async function readSessionMeta(sessionId: string): Promise<EncuentroUploadSessionMeta | null> {
  try {
    const raw = await readFile(path.join(sessionDir(sessionId), "meta.json"), "utf8");
    return JSON.parse(raw) as EncuentroUploadSessionMeta;
  } catch {
    return null;
  }
}

export async function listReceivedChunks(sessionId: string): Promise<number[]> {
  try {
    const entries = await readdir(sessionDir(sessionId));
    return entries
      .filter((name) => name.startsWith("chunk."))
      .map((name) => Number(name.slice("chunk.".length)))
      .filter((n) => Number.isInteger(n))
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

export async function writeSessionChunk(sessionId: string, index: number, buffer: Buffer): Promise<void> {
  await mkdir(sessionDir(sessionId), { recursive: true });
  await writeFile(path.join(sessionDir(sessionId), `chunk.${index}`), buffer);
}

/** ¿Ya existe un archivo final (pendientes/<id>.*) para esta sesión? Cubre la carrera de
 * "se cortó la conexión justo cuando ya había terminado de ensamblar". */
export async function isSessionAlreadyAssembled(meta: EncuentroUploadSessionMeta): Promise<boolean> {
  try {
    await stat(path.join(EVENTO_PENDIENTES_DIR, `${meta.id}.${meta.ext}`));
    return true;
  } catch {
    return false;
  }
}

type AssembleResult = { complete: true; media: EncuentroMediaMeta } | { complete: false; error: string };

/**
 * Concatena las partes en orden en storage/evento/pendientes/, verifica tamaño, calcula el
 * hash final y genera la miniatura (solo fotos). Nunca carga el archivo completo en memoria
 * de una sola vez: lee y escribe de a una parte (máximo 8MB) por vez.
 */
export async function assembleUploadSession(sessionId: string): Promise<AssembleResult> {
  const meta = await readSessionMeta(sessionId);
  if (!meta) return { complete: false, error: "session_not_found" };

  const dir = sessionDir(sessionId);
  const finalPath = path.join(EVENTO_PENDIENTES_DIR, `${meta.id}.${meta.ext}`);
  const partialPath = `${finalPath}.partial`;

  await mkdir(EVENTO_PENDIENTES_DIR, { recursive: true });

  const write = createWriteStream(partialPath);
  const hash = createHash("sha256");
  try {
    for (let i = 0; i < meta.totalChunks; i++) {
      const buf = await readFile(path.join(dir, `chunk.${i}`));
      hash.update(buf);
      if (!write.write(buf)) await once(write, "drain");
    }
    write.end();
    await once(write, "close");
  } catch {
    write.destroy();
    await rm(partialPath, { force: true });
    return { complete: false, error: "assembly_failed" };
  }

  const finalStat = await stat(partialPath);
  if (finalStat.size !== meta.declaredSize) {
    await rm(partialPath, { force: true });
    return { complete: false, error: "size_mismatch" };
  }

  await rename(partialPath, finalPath);

  if (meta.kind === "photo") {
    try {
      await mkdir(EVENTO_THUMBS_DIR, { recursive: true });
      await sharp(finalPath)
        .resize({ width: 480 })
        .webp({ quality: 70 })
        .toFile(path.join(EVENTO_THUMBS_DIR, `${meta.id}.webp`));
    } catch {
      // una miniatura fallida no invalida la subida: la galería cae a un ícono de reemplazo
    }
  }

  const media: EncuentroMediaMeta = {
    id: meta.id,
    ext: meta.ext,
    mime: meta.mime,
    kind: meta.kind,
    size: finalStat.size,
    assembledSha256: hash.digest("hex"),
    uploadedAt: new Date().toISOString(),
  };
  await writeFile(path.join(EVENTO_PENDIENTES_DIR, `${meta.id}.json`), JSON.stringify(media), "utf8");

  await rm(dir, { recursive: true, force: true });

  return { complete: true, media };
}

/**
 * Barrido perezoso, sin tarea programada: se llama al pasar desde /upload/start y desde el
 * GET de pendientes del panel. Borra sesiones de tmp/ con más de 24hs sin actividad. Nunca
 * rompe al request que la disparó (mismo criterio que logChange).
 */
export async function sweepStaleUploadSessions(): Promise<void> {
  try {
    const entries = await readdir(EVENTO_TMP_DIR);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    await Promise.all(
      entries.map(async (name) => {
        const dir = path.join(EVENTO_TMP_DIR, name);
        const info = await stat(dir).catch(() => null);
        if (info && info.mtimeMs < cutoff) {
          await rm(dir, { recursive: true, force: true });
        }
      })
    );
  } catch {
    // tmp/ todavía no existe u otro fallo leyéndolo: no es motivo para romper el request
  }
}
