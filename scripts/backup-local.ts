import "dotenv/config";
import { mkdirSync, readdirSync, statSync, unlinkSync, appendFileSync } from "node:fs";
import path from "node:path";
import { createBackupZip } from "../src/lib/backup";
import { syncBackupToDrive } from "../src/lib/google-drive";
import { pad2 } from "../src/lib/time";

const RETENTION_DAYS = 30;
// Más corto que el local a propósito: Drive tiene espacio limitado, y esto es la copia que
// sale de la máquina del servidor, no la única copia — con una semana alcanza de sobra.
const DRIVE_RETENTION_DAYS = 7;
const BACKUP_PREFIX = "pakua-backup-";
const BACKUP_EXT = ".zip";

function resolveBackupDir(): string {
  const dir = process.env.BACKUP_DIR ?? "storage/backups";
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
}

function timestamp(date: Date): string {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}-${pad2(date.getHours())}${pad2(date.getMinutes())}`;
}

function logLine(message: string): void {
  const logPath = path.join(process.cwd(), "storage", "backup.log");
  mkdirSync(path.dirname(logPath), { recursive: true });
  appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`, "utf8");
}

function pruneOldBackups(backupDir: string): number {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let removed = 0;
  for (const filename of readdirSync(backupDir)) {
    if (!filename.startsWith(BACKUP_PREFIX) || !filename.endsWith(BACKUP_EXT)) continue;
    const filePath = path.join(backupDir, filename);
    if (statSync(filePath).mtimeMs < cutoff) {
      unlinkSync(filePath);
      removed += 1;
    }
  }
  return removed;
}

async function main(): Promise<void> {
  const backupDir = resolveBackupDir();
  mkdirSync(backupDir, { recursive: true });

  const filename = `${BACKUP_PREFIX}${timestamp(new Date())}${BACKUP_EXT}`;
  const destPath = path.join(backupDir, filename);

  await createBackupZip(destPath);

  const sizeBytes = statSync(destPath).size;
  const removed = pruneOldBackups(backupDir);
  const drive = await syncBackupToDrive(destPath, filename, DRIVE_RETENTION_DAYS);
  const driveStatus = drive.uploaded ? `subido, ${drive.removed ?? 0} viejo(s) borrado(s)` : drive.reason;

  logLine(
    `OK backup="${filename}" size=${sizeBytes}b removidos=${removed} retencion=${RETENTION_DAYS}d drive=${driveStatus}`
  );
  console.log(
    `Backup creado: ${destPath} (${sizeBytes} bytes). Backups viejos eliminados: ${removed}. Drive: ${driveStatus}.`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  logLine(`ERROR ${message}`);
  console.error(`Backup falló: ${message}`);
  process.exit(1);
});
