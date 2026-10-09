import { readdir, readFile, unlink } from "node:fs/promises";
import path from "node:path";

// Hermano de storage/uploads, no adentro: así el backup nocturno (src/lib/backup.ts, que solo
// zipea storage/uploads) y el .gitignore nunca necesitan tocarse para dejar esto afuera.
export const EVENTO_ROOT = path.join(/* turbopackIgnore: true */ process.cwd(), "storage", "evento");
export const EVENTO_TMP_DIR = path.join(EVENTO_ROOT, "tmp");
export const EVENTO_PENDIENTES_DIR = path.join(EVENTO_ROOT, "pendientes");
export const EVENTO_APROBADOS_DIR = path.join(EVENTO_ROOT, "aprobados");
export const EVENTO_THUMBS_DIR = path.join(EVENTO_ROOT, "thumbs");

export type EncuentroKind = "photo" | "video";

// Clave = mime declarado por el cliente, nunca el nombre de archivo que manda — así nada
// controlado por el cliente llega al filesystem (mismo criterio que src/lib/upload.ts).
export const ALLOWED_TYPES: Record<string, { ext: string; kind: EncuentroKind }> = {
  "image/jpeg": { ext: "jpg", kind: "photo" },
  "image/png": { ext: "png", kind: "photo" },
  "image/webp": { ext: "webp", kind: "photo" },
  "image/heic": { ext: "heic", kind: "photo" },
  "image/heif": { ext: "heif", kind: "photo" },
  "image/gif": { ext: "gif", kind: "photo" },
  "video/mp4": { ext: "mp4", kind: "video" },
  "video/quicktime": { ext: "mov", kind: "video" },
  "video/webm": { ext: "webm", kind: "video" },
  "video/3gpp": { ext: "3gp", kind: "video" },
  "video/x-m4v": { ext: "m4v", kind: "video" },
};

export const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024; // 1GB
export const CHUNK_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
export const MIN_FREE_DISK_BYTES = 10 * 1024 * 1024 * 1024; // 10GB

export type EncuentroMediaMeta = {
  id: string;
  ext: string;
  mime: string;
  kind: EncuentroKind;
  size: number;
  assembledSha256: string;
  uploadedAt: string;
  approvedAt?: string;
  approvedBy?: string;
};

export type EncuentroStatus = "pendientes" | "aprobados";

export function mediaDir(status: EncuentroStatus): string {
  return status === "pendientes" ? EVENTO_PENDIENTES_DIR : EVENTO_APROBADOS_DIR;
}

/** Borra <id>.<ext> + <id>.json + la miniatura, si existen. Nunca lanza (ENOENT incluido). */
export async function deleteEncuentroMedia(dir: string, id: string, ext: string): Promise<void> {
  const targets = [path.join(dir, `${id}.${ext}`), path.join(dir, `${id}.json`), path.join(EVENTO_THUMBS_DIR, `${id}.webp`)];
  await Promise.all(
    targets.map(async (target) => {
      try {
        await unlink(target);
      } catch {
        // ya no existe o nunca existió: no es un error para el caller
      }
    })
  );
}

/**
 * Lista las metadata (*.json) de un directorio (pendientes/ o aprobados/), más viejo primero.
 * Nunca lanza: una carpeta inexistente o un sidecar corrupto se saltea en vez de romper todo
 * el listado.
 */
export async function listMediaMeta(dir: string): Promise<EncuentroMediaMeta[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const items = await Promise.all(
    entries
      .filter((name) => name.endsWith(".json"))
      .map(async (name) => {
        try {
          const raw = await readFile(path.join(dir, name), "utf8");
          return JSON.parse(raw) as EncuentroMediaMeta;
        } catch {
          return null;
        }
      })
  );

  return items
    .filter((item): item is EncuentroMediaMeta => item !== null)
    .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
}

export const ID_SHAPE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lee la metadata de un ítem puntual por id. null si no existe o el id no tiene forma de UUID. */
export async function findMediaMeta(dir: string, id: string): Promise<EncuentroMediaMeta | null> {
  if (!ID_SHAPE_REGEX.test(id)) return null;
  try {
    const raw = await readFile(path.join(dir, `${id}.json`), "utf8");
    return JSON.parse(raw) as EncuentroMediaMeta;
  } catch {
    return null;
  }
}

/** Cantidad de archivos pendientes, para el badge del sidebar. Nunca lanza (0 si no hay carpeta). */
export async function countPendingEncuentroFiles(): Promise<number> {
  try {
    const entries = await readdir(EVENTO_PENDIENTES_DIR);
    return entries.filter((name) => name.endsWith(".json")).length;
  } catch {
    return 0;
  }
}
