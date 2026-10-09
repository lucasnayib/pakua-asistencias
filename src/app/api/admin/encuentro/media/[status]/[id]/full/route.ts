import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { streamMediaFile } from "@/lib/encuentro-media";
import { findMediaMeta, mediaDir, type EncuentroStatus } from "@/lib/encuentro-storage";

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

  const dir = mediaDir(status);
  const meta = await findMediaMeta(dir, id);
  if (!meta) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const filePath = path.join(dir, `${id}.${meta.ext}`);
  return streamMediaFile(request, filePath, meta.mime, meta.size);
}
