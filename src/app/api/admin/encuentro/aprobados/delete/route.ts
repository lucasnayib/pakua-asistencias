import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { encuentroApproveRejectSchema } from "@/lib/validations";
import { logChange } from "@/lib/audit";
import { EVENTO_APROBADOS_DIR, deleteEncuentroMedia, listMediaMeta } from "@/lib/encuentro-storage";

// La acción de "sacar de aprobados" (confirmada con el usuario): distinta de rechazar un
// pendiente porque "algo que ya era público se bajó" es un evento más sensible — por eso
// tiene su propia acción de auditoría (ENCUENTRO_UNAPPROVE, no ENCUENTRO_REJECT).
export async function POST(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = encuentroApproveRejectSchema.safeParse(body);
  if (!parsed.success || !parsed.data.ids?.length) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const approved = await listMediaMeta(EVENTO_APROBADOS_DIR);
  const toRemove = approved.filter((item) => parsed.data.ids!.includes(item.id));

  for (const item of toRemove) {
    await deleteEncuentroMedia(EVENTO_APROBADOS_DIR, item.id, item.ext);
  }

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "ENCUENTRO_UNAPPROVE",
    entity: "EncuentroMedia",
    detail: `${toRemove.length} archivo(s)`,
  });

  return NextResponse.json({ removed: toRemove.length });
}
