import { NextResponse } from "next/server";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { requireSuperAdmin } from "@/lib/auth";
import { createBackupZip } from "@/lib/backup";
import { logChange } from "@/lib/audit";
import { pad2 } from "@/lib/time";

export async function GET() {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const now = new Date();
  const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}`;
  const filename = `pakua-backup-${stamp}.zip`;
  const tmpZipPath = path.join(/* turbopackIgnore: true */ os.tmpdir(), `pakua-backup-${randomUUID()}.zip`);

  try {
    await createBackupZip(tmpZipPath);
    const buffer = await readFile(tmpZipPath);

    await logChange({
      actor: session.displayName,
      adminId: session.adminId,
      action: "DOWNLOAD_BACKUP",
      entity: "Backup",
      detail: filename,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } finally {
    await rm(tmpZipPath, { force: true });
  }
}
