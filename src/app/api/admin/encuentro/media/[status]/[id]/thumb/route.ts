import path from "node:path";
import { stat } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { streamMediaFile } from "@/lib/encuentro-media";
import { EVENTO_THUMBS_DIR, findMediaMeta, mediaDir, type EncuentroStatus } from "@/lib/encuentro-storage";

type Params = { params: Promise<{ status: string; id: string }> };

function isValidStatus(status: string): status is EncuentroStatus {
  return status === "pendientes" || status === "aprobados";
}

export async function GET(request: NextRequest, { params }: Params) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const { status, id } = await params;
  if (!isValidStatus(status)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const meta = await findMediaMeta(mediaDir(status), id);
  if (!meta || meta.kind !== "photo") {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const thumbPath = path.join(EVENTO_THUMBS_DIR, `${id}.webp`);
  const info = await stat(thumbPath).catch(() => null);
  if (!info) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return streamMediaFile(request, thumbPath, "image/webp", info.size);
}
