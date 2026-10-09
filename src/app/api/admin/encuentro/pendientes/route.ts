import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { sweepStaleUploadSessions } from "@/lib/encuentro-upload";
import { EVENTO_PENDIENTES_DIR, listMediaMeta } from "@/lib/encuentro-storage";

export async function GET() {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  // Segundo disparador del barrido perezoso (el primero es /api/encuentro/upload/start):
  // cada vez que el panel carga, de paso se limpia tmp/ de partes abandonadas.
  await sweepStaleUploadSessions();

  const items = await listMediaMeta(EVENTO_PENDIENTES_DIR);
  return NextResponse.json({ items });
}
