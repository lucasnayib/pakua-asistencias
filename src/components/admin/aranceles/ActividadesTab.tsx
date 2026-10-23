"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OverflowMenu } from "@/components/ui/OverflowMenu";
import { formatMoney } from "@/lib/aranceles-calc";

type TipoArancel = { id: string; name: string; amount: number; active: boolean };

export function ActividadesTab() {
  const [tipos, setTipos] = useState<TipoArancel[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoArancel | null>(null);
  const [formName, setFormName] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TipoArancel | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTipos = useCallback(() => {
    setLoading(true);
    fetch("/api/aranceles/tipos?includeInactive=1")
      .then((r) => r.json())
      .then((data) => setTipos(data.tipos ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTipos();
  }, [loadTipos]);

  function openCreate() {
    setEditingTipo(null);
    setFormName("");
    setFormAmount("");
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(tipo: TipoArancel) {
    setEditingTipo(tipo);
    setFormName(tipo.name);
    setFormAmount(String(tipo.amount));
    setFormError(null);
    setFormOpen(true);
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const amount = Math.round(Number(formAmount));
      if (!formName.trim() || !Number.isFinite(amount) || amount < 0) {
        setFormError("Completá nombre y precio válidos");
        return;
      }
      const res = await fetch(editingTipo ? `/api/aranceles/tipos/${editingTipo.id}` : "/api/aranceles/tipos", {
        method: editingTipo ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "No se pudo guardar");
        return;
      }
      toast.success(editingTipo ? "Actividad actualizada" : "Actividad creada");
      setFormOpen(false);
      loadTipos();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/aranceles/tipos/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo eliminar");
        return;
      }
      toast.success("Actividad eliminada");
      setDeleteTarget(null);
      loadTipos();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Coste de actividades</h2>
          <p className="text-sm text-muted-foreground">
            Definí las actividades que la escuela ofrece (Yoga, Arte Marcial, cursos puntuales,
            etc.) y el precio de cada una. Después se usan para anotar alumnos y cargar cuotas.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          Nueva actividad
        </Button>
      </div>

      {formOpen && (
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:max-w-sm">
          <Input label="Nombre" placeholder='Ej: "Yoga"' value={formName} onChange={(e) => setFormName(e.target.value)} required />
          <Input
            label="Precio"
            type="number"
            min={0}
            step={1}
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
            required
          />
          {formError && <p className="text-xs text-danger">{formError}</p>}
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={saving}>
              Guardar
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" /> Cargando…
        </div>
      ) : tipos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Todavía no definiste ninguna actividad.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tipos.map((t) => (
            <Card key={t.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{formatMoney(t.amount)}</p>
              </div>
              <OverflowMenu
                items={[
                  { label: "Editar", onSelect: () => openEdit(t) },
                  { label: "Eliminar", onSelect: () => setDeleteTarget(t), danger: true },
                ]}
              />
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar actividad"
        message={
          deleteTarget
            ? `Se elimina "${deleteTarget.name}" para siempre, junto con las inscripciones y el historial de pagos de esa actividad. No se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
