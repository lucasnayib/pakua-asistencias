import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { logChange } from "@/lib/audit";
import { currentMonth } from "@/lib/aranceles-calc";
import { getMovimientosList } from "@/lib/aranceles-server";
import { buildArancelesExcelBuffer } from "@/lib/export/aranceles-excel";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const monthParam = request.nextUrl.searchParams.get("month");
  const isAll = monthParam === "all";
  const month = isAll ? null : monthParam || currentMonth();
  const rows = await getMovimientosList(session.adminId, { month });
  const buffer = await buildArancelesExcelBuffer(month, rows);
  const filename = `aranceles_${month ?? "todos"}.xlsx`;

  await logChange({
    actor: session.displayName,
    adminId: session.adminId,
    action: "EXPORT_MOVIMIENTOS_FINANCIEROS",
    entity: "MovimientoFinanciero",
    detail: `${filename} (${rows.length} movimientos)`,
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
