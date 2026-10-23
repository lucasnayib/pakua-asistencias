"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
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
  type LedgerRow,
} from "@/lib/aranceles-calc";

type ResumenResponse = {
  month: string;
  prevMonth: string;
  movimientos: { tipo: string; categoria: string; concepto: string; amount: number; date: string; estado: string }[];
  pagos: { amount: number; month: string; tipoArancel: { name: string } }[];
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
  const [data, setData] = useState<ResumenResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/aranceles/resumen?month=${month}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [month]);

  const rows: LedgerRow[] = useMemo(() => {
    if (!data) return [];
    return [...data.movimientos.map(movimientoToLedgerRow), ...data.pagos.map(pagoToLedgerRow)];
  }, [data]);

  const rowsThisMonth = useMemo(() => rows.filter((r) => r.month === month), [rows, month]);
  const kpis = useMemo(() => calcularKpis(rowsThisMonth), [rowsThisMonth]);
  const desgloseIngresos = useMemo(() => desglosePorCategoria(rowsThisMonth, "INGRESO"), [rowsThisMonth]);
  const desgloseEgresos = useMemo(() => desglosePorCategoria(rowsThisMonth, "EGRESO"), [rowsThisMonth]);
  const comparativa = useMemo(
    () => (data ? calcularComparativaMensual(rows, data.month, data.prevMonth) : null),
    [rows, data]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{formatMonth(month)}</h2>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
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
