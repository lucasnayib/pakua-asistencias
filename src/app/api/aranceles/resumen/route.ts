import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { currentMonth } from "@/lib/aranceles-calc";

function previousMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 - 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Devuelve las filas crudas de los dos meses (el elegido y el anterior, para la comparación);
// el cliente arma los KPIs/desgloses con src/lib/aranceles-calc.ts — misma separación que ya
// usa la app de referencia (GASTOS), mantiene la lógica de negocio testeable en un solo lugar.
export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const month = request.nextUrl.searchParams.get("month") || currentMonth();
  const prevMonth = previousMonth(month);

  const [allMovimientos, pagos] = await Promise.all([
    prisma.movimientoFinanciero.findMany({
      where: { adminId: session.adminId },
      orderBy: [{ date: "desc" }],
    }),
    prisma.pagoArancel.findMany({
      where: { adminId: session.adminId, month: { in: [month, prevMonth] } },
      include: { tipoArancel: true },
    }),
  ]);

  // "date" es "YYYY-MM-DD", acá necesitamos justo estos dos meses puntuales — más simple
  // filtrar en JS que armar un OR de dos startsWith en el where.
  const movimientos = allMovimientos.filter((m) => m.date.startsWith(month) || m.date.startsWith(prevMonth));

  return NextResponse.json({ month, prevMonth, movimientos, pagos });
}
