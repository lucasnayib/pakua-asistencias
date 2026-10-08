import Database from "better-sqlite3";
import { ZipArchive } from "archiver";
import { createWriteStream, existsSync, rmSync } from "node:fs";
import path from "node:path";

function resolveDbPath(): string {
  const rawUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  return path.join(process.cwd(), rawUrl.replace(/^file:/, ""));
}

const UPLOADS_DIR = path.join(process.cwd(), "storage", "uploads");

/**
 * Arma un .zip en destZipPath con una copia consistente de la base (via better-sqlite3
 * .backup(), que maneja bien journal/WAL en vez de copiar el archivo en crudo) más todas
 * las fotos subidas (storage/uploads). La usan tanto el backup automático nocturno
 * (scripts/backup-local.ts) como la descarga manual del super-admin (/api/backup), para no
 * duplicar esta lógica en los dos lados.
 */
export async function createBackupZip(destZipPath: string): Promise<void> {
  const dbPath = resolveDbPath();
  if (!existsSync(dbPath)) {
    throw new Error(`No se encontró la base de datos en "${dbPath}" (revisá DATABASE_URL).`);
  }

  const tmpDbPath = `${destZipPath}.tmp-db`;
  const db = new Database(dbPath, { readonly: true });
  try {
    await db.backup(tmpDbPath);
  } finally {
    db.close();
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(destZipPath);
      const archive = new ZipArchive({ zlib: { level: 9 } });
      output.on("close", resolve);
      archive.on("error", reject);
      archive.pipe(output);
      archive.file(tmpDbPath, { name: "database.db" });
      if (existsSync(UPLOADS_DIR)) archive.directory(UPLOADS_DIR, "uploads");
      archive.finalize();
    });
  } finally {
    rmSync(tmpDbPath, { force: true });
  }
}
