import { readdir } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { ZipArchive } from "archiver";
import { requireSuperAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";
import { EVENTO_APROBADOS_DIR } from "@/lib/encuentro-storage";

// Streaming real, sin precedente en el repo (src/lib/backup.ts solo pipea archiver a un
// archivo en disco, nunca a una respuesta HTTP). Nivel 0: los medios ya vienen comprimidos,
// a diferencia de la base de datos de los backups.
export async function GET() {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const entries = await readdir(EVENTO_APROBADOS_DIR).catch(() => [] as string[]);
  const archive = new ZipArchive({ zlib: { level: 0 } });

  for (const name of entries) {
    if (name.endsWith(".json")) continue; // nunca empaquetar el sidecar de metadata
    archive.file(path.join(EVENTO_APROBADOS_DIR, name), { name });
  }
  archive.finalize();

  // Se registra al arrancar, no cuando termina: una descarga grande puede no terminar nunca
  // si se corta la conexión, y lo que importa auditar es que alguien la arrancó.
  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "ENCUENTRO_DOWNLOAD_ZIP",
    entity: "EncuentroAprobados",
  });

  return new Response(Readable.toWeb(archive) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="encuentro-aprobados.zip"`,
    },
  });
}
