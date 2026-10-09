import { NextResponse } from "next/server";
import checkDiskSpace from "check-disk-space";
import { requireSuperAdmin } from "@/lib/auth";
import { EVENTO_APROBADOS_DIR, EVENTO_ROOT, listMediaMeta } from "@/lib/encuentro-storage";

export async function GET() {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const items = await listMediaMeta(EVENTO_APROBADOS_DIR);
  items.reverse(); // más nuevo primero

  const usedBytes = items.reduce((total, item) => total + item.size, 0);
  const freeBytes = await checkDiskSpace(EVENTO_ROOT)
    .then((d) => d.free)
    .catch(() => null);

  return NextResponse.json({ items, count: items.length, usedBytes, freeBytes });
}
