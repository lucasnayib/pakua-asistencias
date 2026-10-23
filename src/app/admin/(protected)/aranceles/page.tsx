"use client";

import { useState } from "react";
import { ResumenTab } from "@/components/admin/aranceles/ResumenTab";
import { ActividadesTab } from "@/components/admin/aranceles/ActividadesTab";
import { MovimientosTab } from "@/components/admin/aranceles/MovimientosTab";

type Tab = "resumen" | "actividades" | "movimientos";

const TABS: { id: Tab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "actividades", label: "Coste de actividades" },
  { id: "movimientos", label: "Gastos e ingresos" },
];

export default function ArancelesAdminPage() {
  const [tab, setTab] = useState<Tab>("resumen");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Aranceles</h1>
        <p className="text-sm text-muted-foreground">
          Gastos de la escuela e ingresos por cuotas de los alumnos.
        </p>
      </div>

      <div className="flex h-10 w-fit gap-1 rounded-lg border border-border p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            data-tour={t.id === "movimientos" ? "tab-movimientos" : undefined}
            className={`rounded-md px-3 text-sm font-medium transition ${
              tab === t.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-surface-2"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "resumen" && <ResumenTab />}
      {tab === "actividades" && <ActividadesTab />}
      {tab === "movimientos" && <MovimientosTab />}
    </div>
  );
}
