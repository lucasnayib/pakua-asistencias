import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { EVENTO_ROOT } from "@/lib/encuentro-storage";

const CONFIG_PATH = path.join(EVENTO_ROOT, "config.json");

export type EncuentroConfig = {
  galleryToken: string | null;
  galleryEnabled: boolean;
};

const DEFAULT_CONFIG: EncuentroConfig = { galleryToken: null, galleryEnabled: false };

/** Nunca lanza: si el archivo no existe o no parsea, devuelve el default seguro (galería apagada). */
export async function readEncuentroConfig(): Promise<EncuentroConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      galleryToken: typeof parsed.galleryToken === "string" ? parsed.galleryToken : null,
      galleryEnabled: parsed.galleryEnabled === true,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

// Escribe a un archivo temporal y renombra encima del real: evita que un lector concurrente
// vea un config.json a medio escribir.
export async function writeEncuentroConfig(config: EncuentroConfig): Promise<void> {
  await mkdir(EVENTO_ROOT, { recursive: true });
  const tmpPath = `${CONFIG_PATH}.tmp`;
  await writeFile(tmpPath, JSON.stringify(config, null, 2), "utf8");
  await rename(tmpPath, CONFIG_PATH);
}

export async function regenerateGalleryToken(): Promise<EncuentroConfig> {
  const current = await readEncuentroConfig();
  const next: EncuentroConfig = { ...current, galleryToken: randomBytes(24).toString("base64url") };
  await writeEncuentroConfig(next);
  return next;
}

export async function setGalleryEnabled(enabled: boolean): Promise<EncuentroConfig> {
  const current = await readEncuentroConfig();
  const next: EncuentroConfig = { ...current, galleryEnabled: enabled };
  await writeEncuentroConfig(next);
  return next;
}

export function buildGalleryUrl(token: string | null): string | null {
  if (!token) return null;
  const base = process.env.APP_BASE_URL ?? "https://attendio.lat";
  return `${base}/encuentro/galeria?t=${token}`;
}
