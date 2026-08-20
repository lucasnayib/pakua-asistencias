import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Fuera de /public a propósito: Next.js 16 sólo sirve estáticamente los archivos
// de /public que existían al momento del build, así que las fotos subidas en
// runtime se sirven dinámicamente vía /api/uploads/[grupo]/[filename] (route.ts).
export const STUDENT_PHOTOS_DIR = path.join(process.cwd(), "storage", "uploads", "students");
export const ORIENTADOR_PHOTOS_DIR = path.join(process.cwd(), "storage", "uploads", "orientadores");

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export class UploadError extends Error {}

async function savePhoto(file: File, dir: string): Promise<string> {
  if (!(file.type in ALLOWED_TYPES)) {
    throw new UploadError("Formato de imagen no soportado. Usá JPG, PNG o WEBP.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new UploadError("La imagen supera los 5MB permitidos.");
  }

  await mkdir(dir, { recursive: true });

  const extension = ALLOWED_TYPES[file.type];
  const filename = `${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return filename;
}

async function deletePhoto(dir: string, prefix: string, photoUrl: string | null | undefined): Promise<void> {
  if (!photoUrl || !photoUrl.startsWith(prefix)) return;
  const filename = photoUrl.slice(prefix.length);
  try {
    await unlink(path.join(dir, filename));
  } catch {
    // el archivo ya no existe o nunca existió: no es un error para el caller
  }
}

/** Guarda la foto de un alumno y devuelve la URL pública (servida por una API route). */
export async function saveStudentPhoto(file: File): Promise<string> {
  const filename = await savePhoto(file, STUDENT_PHOTOS_DIR);
  return `/api/uploads/students/${filename}`;
}

/** Borra una foto previa de alumno. No lanza si el archivo no existe. */
export async function deleteStudentPhoto(photoUrl: string | null | undefined): Promise<void> {
  await deletePhoto(STUDENT_PHOTOS_DIR, "/api/uploads/students/", photoUrl);
}

/** Guarda la foto de un orientador y devuelve la URL pública (servida por una API route). */
export async function saveOrientadorPhoto(file: File): Promise<string> {
  const filename = await savePhoto(file, ORIENTADOR_PHOTOS_DIR);
  return `/api/uploads/orientadores/${filename}`;
}

/** Borra una foto previa de orientador. No lanza si el archivo no existe. */
export async function deleteOrientadorPhoto(photoUrl: string | null | undefined): Promise<void> {
  await deletePhoto(ORIENTADOR_PHOTOS_DIR, "/api/uploads/orientadores/", photoUrl);
}
