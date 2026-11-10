"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDateEs } from "@/lib/time";

type Solicitud = {
  id: string;
  type: string;
  targetLabel: string | null;
  reason: string;
  status: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  admin: { displayName: string; username: string; slug: string };
};

const TYPE_LABELS: Record<string, string> = {
  ELIMINAR_MOVIMIENTO: "Borrar movimiento con recibo exportado",
};

const STATUS_BADGE: Record<Solicitud["status"], string> = {
  PENDIENTE: "bg-accent/15 text-accent",
  APROBADA: "bg-success/15 text-success",
  RECHAZADA: "bg-danger/15 text-danger",
};

// Bandeja genérica de solicitudes de los admins de escuela hacia el superadmin — pensada para
// ir sumando más `type` a futuro, aunque hoy solo existe ELIMINAR_MOVIMIENTO (ver
// src/app/api/aranceles/movimientos/solicitudes/route.ts y AdminRequest en el schema).
export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [approving, setApproving] = useState<Solicitud | null>(null);
  const [rejecting, setRejecting] = useState<Solicitud | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/solicitudes")
      .then((r) => r.json())
      .then((data) => setSolicitudes(data.solicitudes ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(id: string, action: "APROBAR" | "RECHAZAR") {
    setActionBusy(true);
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/solicitudes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo resolver la solicitud");
        return;
      }
      toast.success(action === "APROBAR" ? "Solicitud aprobada: se borró el movimiento" : "Solicitud rechazada");
      setApproving(null);
      setRejecting(null);
      load();
    } finally {
      setActionBusy(false);
      setBusyId(null);
    }
  }

  const pendientes = solicitudes.filter((s) => s.status === "PENDIENTE");
  const resueltas = solicitudes.filter((s) => s.status !== "PENDIENTE");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Solicitudes</h1>
        <p className="text-sm text-muted-foreground">
          Consultas y pedidos de los admins de cada escuela que necesitan tu aprobación.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" /> Cargando…
        </div>
      ) : (
        <>
          {pendientes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No hay solicitudes pendientes.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">Pendientes</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pendientes.map((s) => (
                  <Card key={s.id} className="flex flex-col gap-2 border-accent/40 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {TYPE_LABELS[s.type] ?? s.type}
                    </p>
                    <p className="text-sm font-medium">{s.targetLabel ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.admin.displayName} (@{s.admin.username}) · {formatDateEs(s.createdAt.slice(0, 10))}
                    </p>
                    <p className="rounded-lg bg-surface-2 p-2 text-sm">{s.reason}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs">
                      <button
                        className="px-1 py-2 font-medium text-success hover:underline disabled:opacity-50"
                        disabled={busyId === s.id}
                        onClick={() => setApproving(s)}
                      >
                        Aprobar y borrar
                      </button>
                      <button
                        className="px-1 py-2 font-medium text-danger hover:underline disabled:opacity-50"
                        disabled={busyId === s.id}
                        onClick={() => setRejecting(s)}
                      >
                        Rechazar
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {resueltas.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">Resueltas</h2>
              <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
                {resueltas.map((s) => (
                  <li key={s.id} className="flex flex-col gap-1 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{s.targetLabel ?? TYPE_LABELS[s.type] ?? s.type}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[s.status]}`}>
                        {s.status === "APROBADA" ? "Aprobada" : "Rechazada"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.admin.displayName} (@{s.admin.username}) · {formatDateEs(s.createdAt.slice(0, 10))}
                      {s.resolvedAt && ` · resuelta el ${formatDateEs(s.resolvedAt.slice(0, 10))}`}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={approving !== null}
        title="Aprobar y borrar"
        message={
          approving
            ? `Se borrará "${approving.targetLabel}" de forma permanente. Esto no se puede deshacer.`
            : undefined
        }
        confirmLabel="Aprobar y borrar"
        danger
        loading={actionBusy}
        onConfirm={() => approving && resolve(approving.id, "APROBAR")}
        onCancel={() => setApproving(null)}
      />

      <ConfirmDialog
        open={rejecting !== null}
        title="Rechazar solicitud"
        message={rejecting ? `"${rejecting.targetLabel}" sigue protegido contra borrado como estaba.` : undefined}
        confirmLabel="Rechazar"
        danger
        loading={actionBusy}
        onConfirm={() => rejecting && resolve(rejecting.id, "RECHAZAR")}
        onCancel={() => setRejecting(null)}
      />
    </div>
  );
}
