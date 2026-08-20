import { Readable } from "node:stream";
import { google } from "googleapis";

export type DriveUploadResult = { uploaded: boolean; fileId?: string; reason?: string };

function getCredentials() {
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_DRIVE_PRIVATE_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!clientEmail || !privateKeyRaw || !folderId) return null;

  return {
    clientEmail,
    privateKey: privateKeyRaw.replace(/\\n/g, "\n"),
    folderId,
  };
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
  const credentials = getCredentials();
  if (!credentials) {
    return { uploaded: false, reason: "Google Drive no está configurado" };
  }

  try {
    const auth = new google.auth.JWT({
      email: credentials.clientEmail,
      key: credentials.privateKey,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    const drive = google.drive({ version: "v3", auth });
    const response = await drive.files.create({
      requestBody: { name: filename, parents: [credentials.folderId] },
      media: { mimeType, body: Readable.from(buffer) },
      fields: "id",
    });

    return { uploaded: true, fileId: response.data.id ?? undefined };
  } catch (error) {
    console.warn("[google-drive] no se pudo subir el archivo:", error);
    return { uploaded: false, reason: "Error al subir a Google Drive" };
  }
}
