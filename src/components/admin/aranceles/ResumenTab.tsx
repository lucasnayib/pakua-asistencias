"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { getLocalNow } from "@/lib/time";
import {
  calcularComparativaMensual,
  calcularKpis,
  desglosePorCategoria,
  formatMoney,
  formatMonth,
  movimientoToLedgerRow,
  pagoToLedgerRow,
  totalCategoria,
  totalIngresoPropioCategoria,
  type LedgerRow,
} from "@/lib/aranceles-calc";

type ResumenResponse = {
  month: string;
  prevMonth: string;
  movimientos: {
    tipo: string;
    categoria: string;
    concepto: string;
    amount: number;
    date: string;
    estado: string;
    escuelaPorcentaje?: number | null;
  }[];
  pagos: {
    amount: number;
    month: string;
    escuelaPorcentaje?: number | null;
    tipoArancel: { name: string; categoria: string };
  }[];
};

function KpiCard({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : ""}`}>
        {value}
      </p>
    </Card>
  );
}

export function ResumenTab() {
  const [month, setMonth] = useState(() => getLocalNow().date.slice(0, 7));
  const [mesesConDatos, setMesesConDatos] = useState<string[]>(() => [getLocalNow().date.slice(0, 7)]);
  const [data, setData] = useState<ResumenResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/aranceles/resumen?month=${month}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [month]);

  // Desplegable con los meses que ya tienen algo cargado, en vez de un selector de mes libre
  // donde hay que tipear — mismo criterio y mismo endpoint que el filtro de Gastos e ingresos.
  useEffect(() => {
    fetch("/api/aranceles/movimientos/meses")
      .then((r) => r.json())
      .then((d) => setMesesConDatos(d.meses ?? []))
      .catch(() => {});
  }, []);

  const rows: LedgerRow[] = useMemo(() => {
    if (!data) return [];
    return [...data.movimientos.map(movimientoToLedgerRow), ...data.pagos.map(pagoToLedgerRow)];
  }, [data]);

  const rowsThisMonth = useMemo(() => rows.filter((r) => r.month === month), [rows, month]);
  const kpis = useMemo(() => calcularKpis(rowsThisMonth), [rowsThisMonth]);
  const desgloseIngresos = useMemo(() => desglosePorCategoria(rowsThisMonth, "INGRESO"), [rowsThisMonth]);
  const desgloseEgresos = useMemo(() => desglosePorCategoria(rowsThisMonth, "EGRESO"), [rowsThisMonth]);
  const totalFederacion = useMemo(() => totalCategoria(rowsThisMonth, "INGRESO", "FEDERACION"), [rowsThisMonth]);
  const totalFederacionPropio = useMemo(
    () => totalIngresoPropioCategoria(rowsThisMonth, "FEDERACION"),
    [rowsThisMonth]
  );
  const comparativa = useMemo(
    () => (data ? calcularComparativaMensual(rows, data.month, data.prevMonth) : null),
    [rows, data]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{formatMonth(month)}</h2>
        <Select value={month} onChange={(e) => setMonth(e.target.value)} className="w-48">
          {mesesConDatos.map((m) => (
            <option key={m} value={m}>
              {formatMonth(m)}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" /> Cargando…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard label="Ingresos" value={formatMoney(kpis.ingresosTotales)} tone="success" />
            <KpiCard label="Egresos" value={formatMoney(kpis.egresosTotales)} tone="danger" />
            <KpiCard label="Saldo" value={formatMoney(kpis.saldo)} />
          </div>

          {totalFederacion > 0 && (
            <Card className="p-4 text-sm">
              <p className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground">Recaudado para la Federación este mes</span>
                <span className="font-semibold">{formatMoney(totalFederacion)}</span>
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                <span className="text-xs text-muted-foreground">Le queda a la escuela (ya incluido en &quot;Ingresos&quot;)</span>
                <span className="text-sm font-medium text-success">{formatMoney(totalFederacionPropio)}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Se le pasa a la Federación</span>
                <span className="text-sm font-medium">{formatMoney(totalFederacion - totalFederacionPropio)}</span>
              </div>
              {totalFederacionPropio === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Todavía no se cargó el % que le corresponde a la escuela en estos pagos — se está contando como $0.
                </p>
              )}
            </Card>
          )}

          {comparativa && comparativa.egresosAnterior > 0 && (
            <Card className="p-4 text-sm">
              <p className="text-muted-foreground">
                Egresos vs. mes anterior ({formatMonth(data!.prevMonth)}):{" "}
                <span className={comparativa.diferencia > 0 ? "text-danger" : "text-success"}>
                  {comparativa.diferencia > 0 ? "+" : ""}
                  {formatMoney(comparativa.diferencia)}
                  {comparativa.variacionPorcentual !== null && ` (${comparativa.variacionPorcentual.toFixed(0)}%)`}
                </span>
              </p>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Ingresos por categoría
              </h3>
              {desgloseIngresos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin ingresos este mes.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border rounded-xl border border-border text-sm">
                  {desgloseIngresos.map((d) => (
                    <li key={d.categoria} className="flex items-center justify-between p-3">
                      <span>{d.categoria}</span>
                      <span className="font-medium text-success">{formatMoney(d.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Egresos por categoría
              </h3>
              {desgloseEgresos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin egresos este mes.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border rounded-xl border border-border text-sm">
                  {desgloseEgresos.map((d) => (
                    <li key={d.categoria} className="flex items-center justify-between p-3">
                      <span>{d.categoria}</span>
                      <span className="font-medium text-danger">{formatMoney(d.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
