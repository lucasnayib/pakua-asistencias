// Funciones puras (sin Prisma): seguras para importar tanto desde componentes de cliente
// como desde rutas de servidor. Las consultas a la base (que sí necesitan Prisma) viven en
// src/lib/aranceles-server.ts.
import { toArgentinaISODate } from "@/lib/time";

// "YYYY-MM" del mes actual en Argentina. A diferencia de getLocalNow() (pensado para usarse
// del lado del cliente, donde "la hora local" es la del dispositivo de quien está mirando la
// pantalla, en Argentina), esta función se llama solo del lado del servidor — y el servidor
// puede estar corriendo en cualquier huso horario (UTC es lo más común). "Qué mes es hoy" para
// calcular cuotas pendientes tiene que ser el mes en Argentina, no el del servidor.
export function currentMonth(): string {
  return toArgentinaISODate(new Date()).slice(0, 7);
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
  // Solo tiene valor en filas de categoría FEDERACION: % de `amount` que es ingreso propio de
  // la escuela (ver montoIngresoPropio). null/undefined = todavía no se cargó, se trata como 0%.
  escuelaPorcentaje?: number | null;
};

export function movimientoToLedgerRow(m: {
  tipo: string;
  categoria: string;
  concepto: string;
  amount: number;
  date: string;
  estado: string;
  escuelaPorcentaje?: number | null;
}): LedgerRow {
  return {
    tipo: m.tipo as "INGRESO" | "EGRESO",
    categoria: m.categoria,
    concepto: m.concepto,
    amount: m.amount,
    month: m.date.slice(0, 7),
    estado: m.estado as "PAGADO" | "NO_PAGADO",
    escuelaPorcentaje: m.escuelaPorcentaje,
  };
}

export function pagoToLedgerRow(p: {
  amount: number;
  month: string;
  escuelaPorcentaje?: number | null;
  tipoArancel: { name: string; categoria: string };
}): LedgerRow {
  return {
    tipo: "INGRESO",
    categoria: p.tipoArancel.categoria,
    concepto: p.tipoArancel.name,
    amount: p.amount,
    month: p.month,
    estado: "PAGADO",
    escuelaPorcentaje: p.escuelaPorcentaje,
  };
}

/** Solo lo PAGADO cuenta para cualquier total — un PagoArancel siempre pasa (solo existe si
 * ya se pagó); un MovimientoFinanciero NO_PAGADO se registra pero no suma. */
export function soloPagadas(rows: LedgerRow[]): LedgerRow[] {
  return rows.filter((r) => r.estado === "PAGADO");
}

// Categorías de ingreso que la escuela cobra para reenviar a un tercero (hoy solo FEDERACION):
// no son 100% ingreso propio, sino un porcentaje variable que depende de la actividad y del
// momento (ver escuelaPorcentaje en LedgerRow) — el resto no suma en los totales/KPIs ni en el
// desglose por categoría, solo queda como registro de que se cobró y se pagó.
const CATEGORIAS_INGRESO_CON_PORCENTAJE = new Set(["FEDERACION"]);

/** Cuánto de esta fila es de verdad ingreso propio de la escuela. Para la mayoría de las
 * categorías es el monto completo; para FEDERACION es solo el porcentaje acordado (0 si
 * todavía no se cargó ese dato — mismo comportamiento que antes de que existiera el %, cuando
 * FEDERACION se excluía por completo). */
export function montoIngresoPropio(row: { tipo: string; categoria: string; amount: number; escuelaPorcentaje?: number | null }): number {
  if (row.tipo !== "INGRESO") return 0;
  if (!CATEGORIAS_INGRESO_CON_PORCENTAJE.has(row.categoria)) return row.amount;
  return Math.round((row.amount * (row.escuelaPorcentaje ?? 0)) / 100);
}

export function totalPorTipo(rows: LedgerRow[], tipo: "INGRESO" | "EGRESO"): number {
  const pagadas = soloPagadas(rows).filter((r) => r.tipo === tipo);
  if (tipo === "EGRESO") return pagadas.reduce((sum, r) => sum + r.amount, 0);
  return pagadas.reduce((sum, r) => sum + montoIngresoPropio(r), 0);
}

/** Total pagado de una categoría puntual, sin importar si cuenta como ingreso propio —
 * se usa para mostrar por separado lo recaudado para terceros (ej. FEDERACION), que no
 * debe sumar en "Ingresos" pero sí tiene que poder verse cuánto es. */
export function totalCategoria(rows: LedgerRow[], tipo: "INGRESO" | "EGRESO", categoria: string): number {
  return soloPagadas(rows)
    .filter((r) => r.tipo === tipo && r.categoria === categoria)
    .reduce((sum, r) => sum + r.amount, 0);
}

/** De lo recaudado para una categoría con porcentaje variable (ver montoIngresoPropio), cuánto
 * de eso es de verdad ingreso propio de la escuela — complementa totalCategoria (que da el
 * total recaudado, sin descontar nada) para poder mostrar el desglose completo. */
export function totalIngresoPropioCategoria(rows: LedgerRow[], categoria: string): number {
  return soloPagadas(rows)
    .filter((r) => r.tipo === "INGRESO" && r.categoria === categoria)
    .reduce((sum, r) => sum + montoIngresoPropio(r), 0);
}

export function calcularKpis(rows: LedgerRow[]) {
  const ingresosTotales = totalPorTipo(rows, "INGRESO");
  const egresosTotales = totalPorTipo(rows, "EGRESO");
  return { ingresosTotales, egresosTotales, saldo: ingresosTotales - egresosTotales };
}

export function desglosePorCategoria(rows: LedgerRow[], tipo: "INGRESO" | "EGRESO") {
  const porCategoria = new Map<string, number>();
  for (const row of soloPagadas(rows).filter((r) => r.tipo === tipo)) {
    const monto = tipo === "EGRESO" ? row.amount : montoIngresoPropio(row);
    if (monto === 0) continue;
    porCategoria.set(row.categoria, (porCategoria.get(row.categoria) ?? 0) + monto);
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
