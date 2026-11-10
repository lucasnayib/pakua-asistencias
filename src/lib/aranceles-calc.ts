// Funciones puras (sin Prisma): seguras para importar tanto desde componentes de cliente
// como desde rutas de servidor. Las consultas a la base (que sí necesitan Prisma) viven en
// src/lib/aranceles-server.ts.
import { getLocalNow } from "@/lib/time";

/** "YYYY-MM" del día de hoy (hora local del dispositivo/servidor según dónde se llame). */
export function currentMonth(): string {
  return getLocalNow().date.slice(0, 7);
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  if (!year || !m) return month;
  const names = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  return `${names[Number(m) - 1] ?? m} ${year}`;
}

/** Fila normalizada para los cálculos de abajo: un MovimientoFinanciero o un PagoArancel
 * (siempre "pagado", porque solo existe una fila de PagoArancel cuando ya se pagó) vistos
 * como un mismo tipo de movimiento. */
export type LedgerRow = {
  tipo: "INGRESO" | "EGRESO";
  categoria: string;
  concepto: string;
  amount: number;
  month: string; // "YYYY-MM"
  estado: "PAGADO" | "NO_PAGADO";
};

export function movimientoToLedgerRow(m: {
  tipo: string;
  categoria: string;
  concepto: string;
  amount: number;
  date: string;
  estado: string;
}): LedgerRow {
  return {
    tipo: m.tipo as "INGRESO" | "EGRESO",
    categoria: m.categoria,
    concepto: m.concepto,
    amount: m.amount,
    month: m.date.slice(0, 7),
    estado: m.estado as "PAGADO" | "NO_PAGADO",
  };
}

export function pagoToLedgerRow(p: {
  amount: number;
  month: string;
  tipoArancel: { name: string; categoria: string };
}): LedgerRow {
  return {
    tipo: "INGRESO",
    categoria: p.tipoArancel.categoria,
    concepto: p.tipoArancel.name,
    amount: p.amount,
    month: p.month,
    estado: "PAGADO",
  };
}

/** Solo lo PAGADO cuenta para cualquier total — un PagoArancel siempre pasa (solo existe si
 * ya se pagó); un MovimientoFinanciero NO_PAGADO se registra pero no suma. */
export function soloPagadas(rows: LedgerRow[]): LedgerRow[] {
  return rows.filter((r) => r.estado === "PAGADO");
}

// Categorías de ingreso que no son ingreso propio de la escuela: se cobran para reenviar a un
// tercero (ej. FEDERACION) y solo quedan como registro de que se cobró y se pagó, sin sumar en
// los totales/KPIs ni en el desglose por categoría.
const CATEGORIAS_INGRESO_NO_PROPIO = new Set(["FEDERACION"]);

export function esIngresoPropio(row: { tipo: string; categoria: string }): boolean {
  return row.tipo !== "INGRESO" || !CATEGORIAS_INGRESO_NO_PROPIO.has(row.categoria);
}

export function totalPorTipo(rows: LedgerRow[], tipo: "INGRESO" | "EGRESO"): number {
  return soloPagadas(rows)
    .filter((r) => r.tipo === tipo && esIngresoPropio(r))
    .reduce((sum, r) => sum + r.amount, 0);
}

/** Total pagado de una categoría puntual, sin importar si cuenta como ingreso propio —
 * se usa para mostrar por separado lo recaudado para terceros (ej. FEDERACION), que no
 * debe sumar en "Ingresos" pero sí tiene que poder verse cuánto es. */
export function totalCategoria(rows: LedgerRow[], tipo: "INGRESO" | "EGRESO", categoria: string): number {
  return soloPagadas(rows)
    .filter((r) => r.tipo === tipo && r.categoria === categoria)
    .reduce((sum, r) => sum + r.amount, 0);
}

export function calcularKpis(rows: LedgerRow[]) {
  const ingresosTotales = totalPorTipo(rows, "INGRESO");
  const egresosTotales = totalPorTipo(rows, "EGRESO");
  return { ingresosTotales, egresosTotales, saldo: ingresosTotales - egresosTotales };
}

export function desglosePorCategoria(rows: LedgerRow[], tipo: "INGRESO" | "EGRESO") {
  const porCategoria = new Map<string, number>();
  for (const row of soloPagadas(rows).filter((r) => r.tipo === tipo && esIngresoPropio(r))) {
    porCategoria.set(row.categoria, (porCategoria.get(row.categoria) ?? 0) + row.amount);
  }
  return Array.from(porCategoria.entries())
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);
}

/** Comparación simple entre dos meses (actual vs anterior), nada más que la diferencia de
 * egresos — la app de referencia (GASTOS) agrega acá un presupuesto diario proyectado, pero
 * eso depende de "hoy" dentro del mes en curso; se deja para una mejora posterior si hace
 * falta, no es parte de lo pedido para esta primera versión. */
export function calcularComparativaMensual(rows: LedgerRow[], mesActual: string, mesAnterior: string) {
  const egresosActual = totalPorTipo(
    rows.filter((r) => r.month === mesActual),
    "EGRESO"
  );
  const egresosAnterior = totalPorTipo(
    rows.filter((r) => r.month === mesAnterior),
    "EGRESO"
  );
  const diferencia = egresosActual - egresosAnterior;
  const variacionPorcentual = egresosAnterior > 0 ? (diferencia / egresosAnterior) * 100 : null;
  return { egresosActual, egresosAnterior, diferencia, variacionPorcentual };
}
