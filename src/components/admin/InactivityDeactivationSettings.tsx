"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export function InactivityDeactivationSettings() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [days, setDays] = useState("14");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/inactivity-settings")
      .then((res) => res.json())
      .then((data: { inactivityDeactivationDays: number | null }) => {
        if (data.inactivityDeactivationDays !== null) {
          setEnabled(true);
          setDays(String(data.inactivityDeactivationDays));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(value: number | null) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/inactivity-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inactivityDeactivationDays: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo guardar");
        return;
      }
      toast.success(value === null ? "Baja automática desactivada" : "Baja automática por inactividad guardada");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = Number(days);
    if (!Number.isInteger(parsed) || parsed < 1) {
      toast.error("Ingresá un número de días válido");
      return;
    }
    await save(parsed);
  }

  async function handleToggle(next: boolean) {
    setEnabled(next);
    if (!next) await save(null);
  }

  if (loading) return null;

  return (
    <Card className="max-w-md p-6">
      <h2 className="text-lg font-semibold">Baja automática por inactividad</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Si la activás, todos los días se revisa: un alumno que ya tuvo al menos una asistencia
        y luego pasa este plazo sin ninguna asistencia nueva queda dado de baja solo, igual que
        si lo dieras de baja a mano. Se te avisa por mail cada vez que pase.
      </p>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => handleToggle(e.target.checked)} />
        Activar baja automática
      </label>

      {enabled && (
        <form onSubmit={handleSubmit} className="mt-4 flex items-end gap-2">
          <Input
            label="Días sin asistencia"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            inputMode="numeric"
            className="w-40"
          />
          <Button type="submit" loading={saving}>
            Guardar
          </Button>
        </form>
      )}
    </Card>
  );
}
