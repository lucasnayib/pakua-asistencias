import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { encuentroApproveRejectSchema } from "@/lib/validations";
import { logChange } from "@/lib/audit";
import { EVENTO_PENDIENTES_DIR, deleteEncuentroMedia, listMediaMeta } from "@/lib/encuentro-storage";

// Borrado duro: no hay "deshacer" para un rechazo (ver plan, modelo de 3 estados).
export async function POST(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = encuentroApproveRejectSchema.safeParse(body);
  if (!parsed.success || !parsed.data.ids?.length) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const pending = await listMediaMeta(EVENTO_PENDIENTES_DIR);
  const toReject = pending.filter((item) => parsed.data.ids!.includes(item.id));

  for (const item of toReject) {
    await deleteEncuentroMedia(EVENTO_PENDIENTES_DIR, item.id, item.ext);
  }

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "ENCUENTRO_REJECT",
    entity: "EncuentroMedia",
    detail: `${toReject.length} archivo(s)`,
  });

  return NextResponse.json({ rejected: toReject.length });
}
