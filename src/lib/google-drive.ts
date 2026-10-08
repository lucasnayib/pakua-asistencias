import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { google, drive_v3 } from "googleapis";

export type DriveUploadResult = { uploaded: boolean; fileId?: string; reason?: string };

// Solo el .zip del backup nocturno — nunca borra un archivo exportado por una escuela, aunque
// terminara compartiendo carpeta por error de configuración.
const BACKUP_NAME_PREFIX = "pakua-backup-";

function getServiceAccountCredentials() {
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_DRIVE_PRIVATE_KEY;

  if (!clientEmail || !privateKeyRaw) return null;

  return { clientEmail, privateKey: privateKeyRaw.replace(/\\n/g, "\n") };
}

function createDriveClient(credentials: { clientEmail: string; privateKey: string }): drive_v3.Drive {
  const auth = new google.auth.JWT({
    email: credentials.clientEmail,
    key: credentials.privateKey,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  return google.drive({ version: "v3", auth });
}

/**
 * Sube un archivo a la carpeta de Google Drive configurada por variables de entorno.
 * Si no hay credenciales configuradas, no hace nada: el llamador ya descargó el
 * archivo localmente, así que esto es sólo un extra opcional (ver requerimiento #11).
 */
export async function uploadToDrive(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<DriveUploadResult> {
  const credentials = getServiceAccountCredentials();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!credentials || !folderId) {
    return { uploaded: false, reason: "Google Drive no está configurado" };
  }

  try {
    const drive = createDriveClient(credentials);
    const response = await drive.files.create({
      requestBody: { name: filename, parents: [folderId] },
      media: { mimeType, body: Readable.from(buffer) },
      fields: "id",
    });

    return { uploaded: true, fileId: response.data.id ?? undefined };
  } catch (error) {
    console.warn("[google-drive] no se pudo subir el archivo:", error);
    return { uploaded: false, reason: "Error al subir a Google Drive" };
  }
}

/**
 * Borra de la carpeta de backups los .zip con más de retentionDays, para que la carpeta de
 * Drive no crezca sin límite. Filtra por BACKUP_NAME_PREFIX además de por carpeta — doble
 * resguardo para nunca tocar un archivo que no sea un backup nuestro.
 */
async function pruneOldDriveBackups(drive: drive_v3.Drive, folderId: string, retentionDays: number): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false and name contains '${BACKUP_NAME_PREFIX}' and createdTime < '${cutoff}'`,
    fields: "files(id, name)",
    pageSize: 1000,
  });

  let removed = 0;
  for (const file of data.files ?? []) {
    if (!file.id) continue;
    await drive.files.delete({ fileId: file.id });
    removed += 1;
  }
  return removed;
}

/**
 * Sube el .zip del backup nocturno a la carpeta de Drive dedicada a backups (separada de la
 * de exportaciones, ver GOOGLE_DRIVE_BACKUP_FOLDER_ID en .env.example) y borra los que ya
 * pasaron el período de retención, para que el espacio en Drive no crezca sin límite. Si no
 * hay credenciales o carpeta configuradas, no hace nada: el backup local ya se guardó antes
 * de llamar a esto, así que es un extra opcional.
 */
export async function syncBackupToDrive(
  filePath: string,
  filename: string,
  retentionDays: number
): Promise<DriveUploadResult & { removed?: number }> {
  const credentials = getServiceAccountCredentials();
  const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
  if (!credentials || !folderId) {
    return { uploaded: false, reason: "Backup a Google Drive no está configurado" };
  }

  try {
    const drive = createDriveClient(credentials);
    const response = await drive.files.create({
      requestBody: { name: filename, parents: [folderId] },
      media: { mimeType: "application/zip", body: createReadStream(filePath) },
      fields: "id",
    });

    const removed = await pruneOldDriveBackups(drive, folderId, retentionDays);

    return { uploaded: true, fileId: response.data.id ?? undefined, removed };
  } catch (error) {
    console.warn("[google-drive] no se pudo sincronizar el backup:", error);
    return { uploaded: false, reason: "Error al sincronizar el backup con Google Drive" };
  }
}
