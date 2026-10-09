import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { encuentroApproveRejectSchema } from "@/lib/validations";
import { logChange } from "@/lib/audit";
import { EVENTO_APROBADOS_DIR, EVENTO_PENDIENTES_DIR, listMediaMeta, type EncuentroMediaMeta } from "@/lib/encuentro-storage";

export async function POST(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = encuentroApproveRejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const pending = await listMediaMeta(EVENTO_PENDIENTES_DIR);

  // "all" se resuelve acá, re-listando en el momento — nunca confiamos en que una lista de
  // ids mandada por el cliente sea equivalente a "todo lo que hay ahora".
  const toApprove = parsed.data.all
    ? pending
    : pending.filter((item) => (parsed.data.ids ?? []).includes(item.id));

  if (toApprove.length === 0) {
    return NextResponse.json({ error: "No hay nada para aprobar" }, { status: 400 });
  }

  await mkdir(EVENTO_APROBADOS_DIR, { recursive: true });

  const approvedAt = new Date().toISOString();
  for (const item of toApprove) {
    const updated: EncuentroMediaMeta = { ...item, approvedAt, approvedBy: session.displayName };
    await rename(
      path.join(EVENTO_PENDIENTES_DIR, `${item.id}.${item.ext}`),
      path.join(EVENTO_APROBADOS_DIR, `${item.id}.${item.ext}`)
    );
    await writeFile(path.join(EVENTO_APROBADOS_DIR, `${item.id}.json`), JSON.stringify(updated), "utf8");
    // El sidecar .json se reescribe (con approvedAt/approvedBy) en vez de moverse, así que
    // el viejo en pendientes/ queda huérfano si no se borra a mano.
    await rm(path.join(EVENTO_PENDIENTES_DIR, `${item.id}.json`), { force: true });
  }

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "ENCUENTRO_APPROVE",
    entity: "EncuentroMedia",
    detail: `${toApprove.length} archivo(s)`,
  });

  return NextResponse.json({ approved: toApprove.length });
}
