"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import type { StudentStat } from "@/lib/stats";

export function StatsTable({ stats }: { stats: StudentStat[] }) {
  const [search, setSearch] = useState("");

  const filtered = stats.filter((s) =>
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Buscar alumno"
        placeholder="Nombre o apellido…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-64"
      />

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Alumno</th>
              <th className="px-4 py-3">Presentes</th>
              <th className="px-4 py-3">Clases esperadas</th>
              <th className="px-4 py-3">% Asistencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((s) => (
              <tr key={s.studentId} className="bg-surface">
                <td className="px-4 py-3 font-medium">
                  {s.lastName}, {s.firstName}
                </td>
                <td className="px-4 py-3">{s.presentCount}</td>
                <td className="px-4 py-3">{s.expectedCount}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-success"
                        style={{ width: `${Math.min(100, s.percentage)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{s.percentage}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
