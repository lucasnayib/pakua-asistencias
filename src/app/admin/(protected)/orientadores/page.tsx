"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OrientadorFormDialog } from "@/components/admin/OrientadorFormDialog";
import type { OrientadorListItem } from "@/types";

export default function OrientadoresAdminPage() {
  const [orientadores, setOrientadores] = useState<OrientadorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OrientadorListItem | null>(null);
  const [deleting, setDeleting] = useState<OrientadorListItem | null>(null);
  const [busy, setBusy] = useState(false);

  const loadOrientadores = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    fetch(`/api/orientadores?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setOrientadores(data.orientadores ?? []))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    loadOrientadores();
  }, [loadOrientadores]);

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orientadores/${deleting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo eliminar el orientador");
        return;
      }
      toast.success("Orientador eliminado");
      setDeleting(null);
      loadOrientadores();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Orientadores</h1>
          <p className="text-sm text-muted-foreground">Datos de contacto y alumnos a cargo de cada orientador</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Nuevo orientador
        </Button>
      </div>

      <Input
        label="Buscar"
        placeholder="Nombre o apellido…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-64"
      />

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" /> Cargando…
        </div>
      ) : orientadores.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Todavía no creaste ningún orientador.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orientadores.map((o) => (
            <Card key={o.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2">
                  {o.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {o.firstName[0]}
                      {o.lastName[0]}
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {o.firstName} {o.lastName}
                  </p>
                  {o.email && <p className="truncate text-xs text-muted-foreground">{o.email}</p>}
                  {o.phone && <p className="truncate text-xs text-muted-foreground">{o.phone}</p>}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <button
                      className="text-muted-foreground hover:underline"
                      onClick={() => {
                        setEditing(o);
                        setFormOpen(true);
                      }}
                    >
                      Editar
                    </button>
                    <button className="text-danger hover:underline" onClick={() => setDeleting(o)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>

              <details className="group flex flex-col gap-2 border-t border-border pt-3 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3 w-3 shrink-0 transition-transform group-open:rotate-90"
                    >
                      <path d="M7 5l6 5-6 5V5z" />
                    </svg>
                    Alumnos a cargo ({o.students.length})
                  </span>
                  {o.students.length > 0 && (
                    <a
                      href={`/api/orientadores/${o.id}/export`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      Exportar Excel
                    </a>
                  )}
                </summary>
                {o.students.length === 0 ? (
                  <p className="pt-2 text-xs text-muted-foreground">Sin alumnos asignados todavía.</p>
                ) : (
                  <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto pt-2 text-sm">
                    {o.students.map((s) => (
                      <li key={s.id} className="truncate">
                        {s.firstName} {s.lastName}
                        {!s.active && <span className="ml-1 text-xs text-danger">(baja)</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </Card>
          ))}
        </div>
      )}

      <OrientadorFormDialog
        open={formOpen}
        orientador={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          loadOrientadores();
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar orientador"
        message={deleting ? `Se eliminará a "${deleting.firstName} ${deleting.lastName}" y sus asignaciones de alumnos.` : ""}
        confirmLabel="Eliminar"
        danger
        loading={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
