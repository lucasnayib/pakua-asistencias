import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";
import { pad2 } from "@/lib/time";

export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const rawUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  const relativePath = rawUrl.replace(/^file:/, "");
  const dbPath = path.join(/* turbopackIgnore: true */ process.cwd(), relativePath);

  const buffer = await readFile(dbPath);

  const now = new Date();
  const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}`;
  const filename = `pakua-backup-${stamp}.db`;

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
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
